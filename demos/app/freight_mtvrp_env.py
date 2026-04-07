from __future__ import annotations

import torch
from rl4co.utils.ops import gather_by_index, get_distance
from tensordict import TensorDict

from routefinder.envs.mtvrp.env import MTVRPEnv


class FreightMTVRPEnv(MTVRPEnv):
    def _reset(
        self,
        td: TensorDict | None,
        batch_size: list | None = None,
    ) -> TensorDict:
        device = td.device
        bs = batch_size if batch_size is not None else td.batch_size
        n_cust = td["locs"].shape[-2] - 1
        pp = td.get("pickup_predecessor")
        if pp is None:
            pp = torch.full((*bs, n_cust), -1, dtype=torch.long, device=device)
        else:
            pp = pp.long()
            if pp.shape[-1] != n_cust:
                if pp.shape[-1] > n_cust:
                    pp = pp[..., :n_cust]
                else:
                    pad = n_cust - pp.shape[-1]
                    pp = torch.cat(
                        [
                            pp,
                            torch.full(
                                (*bs, pad), -1, dtype=torch.long, device=device
                            ),
                        ],
                        dim=-1,
                    )

        td_reset = super()._reset(td, batch_size)
        td_reset["pickup_predecessor"] = torch.cat(
            [
                torch.full((*bs, 1), -1, dtype=torch.long, device=device),
                pp,
            ],
            dim=-1,
        )
        return td_reset

    def _step(self, td: TensorDict) -> TensorDict:
        prev_node, curr_node = td["current_node"], td["action"]
        prev_loc = gather_by_index(td["locs"], prev_node)
        curr_loc = gather_by_index(td["locs"], curr_node)
        distance = get_distance(prev_loc, curr_loc)[..., None]

        service_time = gather_by_index(
            src=td["service_time"], idx=curr_node, dim=1, squeeze=False
        )
        start_times = gather_by_index(
            src=td["time_windows"], idx=curr_node, dim=1, squeeze=False
        )[..., 0]
        curr_time = (curr_node[:, None] != 0) * (
            torch.max(td["current_time"] + distance / td["speed"], start_times)
            + service_time
        )

        curr_route_length = (curr_node[:, None] != 0) * (
            td["current_route_length"] + distance
        )

        selected_demand_linehaul = gather_by_index(
            td["demand_linehaul"], curr_node, dim=1, squeeze=False
        )
        selected_demand_backhaul = gather_by_index(
            td["demand_backhaul"], curr_node, dim=1, squeeze=False
        )

        at_cust = curr_node[:, None] != 0

        used_capacity_linehaul = at_cust.float() * (
            td["used_capacity_linehaul"] + selected_demand_linehaul
        )
        used_capacity_backhaul = at_cust.float() * (
            td["used_capacity_backhaul"] + selected_demand_backhaul
        )

        visited = td["visited"].scatter(-1, curr_node[..., None], True)
        done = visited.sum(-1) == visited.size(-1)
        reward = torch.zeros_like(done).float()

        td.update(
            {
                "current_node": curr_node,
                "current_route_length": curr_route_length,
                "current_time": curr_time,
                "done": done,
                "reward": reward,
                "used_capacity_linehaul": used_capacity_linehaul,
                "used_capacity_backhaul": used_capacity_backhaul,
                "visited": visited,
            }
        )
        td.set("action_mask", self.get_action_mask(td))
        return td

    @staticmethod
    def get_action_mask(td: TensorDict) -> torch.Tensor:
        curr_node = td["current_node"]
        locs = td["locs"]
        d_ij = get_distance(
            gather_by_index(locs, curr_node)[..., None, :], locs
        )
        d_j0 = get_distance(locs, locs[..., 0:1, :])

        early_tw, late_tw = (
            td["time_windows"][..., 0],
            td["time_windows"][..., 1],
        )
        arrival_time = td["current_time"] + (d_ij / td["speed"])
        can_reach_customer = arrival_time < late_tw
        can_reach_depot = (
            torch.max(arrival_time, early_tw) + td["service_time"] + (d_j0 / td["speed"])
        ) * ~td["open_route"] < late_tw[..., 0:1]

        exceeds_dist_limit = (
            td["current_route_length"] + d_ij + (d_j0 * ~td["open_route"])
            > td["distance_limit"]
        )

        dl = td["demand_linehaul"]
        db = td["demand_backhaul"]
        cl = td["used_capacity_backhaul"] - td["used_capacity_linehaul"]
        cap = td["vehicle_capacity"]

        can_pickup = (cl + db <= cap) | (db <= 0)
        can_deliver = (cl >= dl) | (dl <= 0)

        pred = td.get("pickup_predecessor")
        n_nodes = dl.shape[-1]
        if pred is None:
            pred = torch.full(
                (*td.batch_size, n_nodes),
                -1,
                dtype=torch.long,
                device=dl.device,
            )
        elif pred.shape[-1] != n_nodes:
            if pred.shape[-1] > n_nodes:
                pred = pred[..., :n_nodes]
            else:
                pad = n_nodes - pred.shape[-1]
                pred = torch.cat(
                    [
                        pred,
                        torch.full(
                            (*pred.shape[:-1], pad),
                            -1,
                            dtype=torch.long,
                            device=pred.device,
                        ),
                    ],
                    dim=-1,
                )
        pred_safe = pred.clamp(min=0)
        pred_done = torch.gather(td["visited"], -1, pred_safe)
        precedence_ok = (pred < 0) | pred_done

        freight_ok = can_pickup & can_deliver & precedence_ok

        can_visit = (
            can_reach_customer
            & can_reach_depot
            & freight_ok
            & ~exceeds_dist_limit
            & ~td["visited"]
        )

        can_visit[:, 0] = ~((curr_node == 0) & (can_visit[:, 1:].sum(-1) > 0))
        return can_visit
