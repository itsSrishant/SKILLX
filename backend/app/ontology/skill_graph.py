"""
SkillX Skill Graph — Prompt 2 / Prompt 8
Prerequisite graph, topological ordering, cycle detection.
Zero-API, deterministic.

Used by:
- Gap Engine: ordering recommended skills by prerequisite chain
- Bridge Engine: sequencing bridge pack modules
- Pathway Engine: building learning stages
"""

import logging
from collections import defaultdict, deque
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass

from app.ontology.skill_ontology import SkillOntology, ONTOLOGY_VERSION

logger = logging.getLogger("SkillGraph")


@dataclass
class TopologicalResult:
    order: List[str]              # skill_ids in learning order
    cycles_detected: List[List[str]]  # any circular prerequisite chains
    confidence: float             # 1.0 if no cycles; reduced if cycles found
    note: str = ""


class SkillGraph:
    """
    Directed Acyclic Graph of skill prerequisites and parent-child hierarchy.

    Nodes: skill_id strings
    Edges: prerequisite_of (A → B means "learn A before B")
           parent_of (A → B means "A is broader than B")

    Provides:
    - Topological sort (learning order)
    - Cycle detection
    - Prerequisite completeness check
    - Ancestor / descendant traversal
    """

    def __init__(self):
        self._ontology = SkillOntology.get()
        # prerequisite edges: skill_id → set of skill_ids that require it
        self._prereq_edges: Dict[str, Set[str]] = defaultdict(set)
        # reverse: skill_id → set of its prerequisites
        self._prereq_of: Dict[str, Set[str]] = defaultdict(set)
        self._build_graph()

    def _build_graph(self):
        for skill in self._ontology.all_skills():
            for prereq_id in skill.prerequisite_skill_ids:
                # prereq_id must be learned before skill.skill_id
                self._prereq_edges[prereq_id].add(skill.skill_id)
                self._prereq_of[skill.skill_id].add(prereq_id)
        logger.info(
            f"SkillGraph built: {len(self._prereq_of)} skills with prerequisites."
        )

    # ── Prerequisite checking ──────────────────────────────────────────────────

    def get_direct_prerequisites(self, skill_id: str) -> List[str]:
        """Direct (one-hop) prerequisites for a skill."""
        return list(self._prereq_of.get(skill_id, set()))

    def get_all_prerequisites(self, skill_id: str) -> List[str]:
        """
        All transitive prerequisites for a skill (BFS, cycle-safe).
        Returns in dependency order (foundational skills first).
        """
        visited: Set[str] = set()
        queue = deque(self._prereq_of.get(skill_id, set()))
        order: List[str] = []

        while queue:
            current = queue.popleft()
            if current in visited:
                continue
            visited.add(current)
            order.append(current)
            for prereq in self._prereq_of.get(current, set()):
                if prereq not in visited:
                    queue.append(prereq)

        return order

    def prerequisites_satisfied(
        self,
        skill_id: str,
        known_skill_ids: Set[str],
    ) -> Tuple[bool, List[str]]:
        """
        Check if all direct prerequisites of a skill are in known_skill_ids.
        Returns (all_satisfied, list_of_missing_prerequisites).
        """
        direct_prereqs = self.get_direct_prerequisites(skill_id)
        missing = [p for p in direct_prereqs if p not in known_skill_ids]
        return len(missing) == 0, missing

    # ── Topological sort ───────────────────────────────────────────────────────

    def topological_sort(
        self, skill_ids: List[str]
    ) -> TopologicalResult:
        """
        Sort a list of skill_ids so that prerequisites come before dependents.

        If a skill in the list has a prerequisite NOT in the list, the prerequisite
        is inserted at the front (if it exists in the ontology).

        Cycle detection uses DFS coloring:
        - WHITE (0): not visited
        - GRAY (1): in current DFS stack (back edge = cycle)
        - BLACK (2): fully processed
        """
        # Expand to include any missing prerequisites from the ontology
        expanded = set(skill_ids)
        for sid in skill_ids:
            for prereq in self.get_all_prerequisites(sid):
                expanded.add(prereq)

        expanded_list = list(expanded)
        color: Dict[str, int] = {s: 0 for s in expanded_list}
        result: List[str] = []
        cycles: List[List[str]] = []
        path: List[str] = []

        def dfs(node: str):
            if color[node] == 2:
                return
            if color[node] == 1:
                # Back edge = cycle detected
                cycle_start = path.index(node)
                cycles.append(path[cycle_start:] + [node])
                return
            color[node] = 1
            path.append(node)
            for child in self._prereq_edges.get(node, set()):
                if child in color:
                    dfs(child)
            path.pop()
            color[node] = 2
            result.append(node)

        for sid in expanded_list:
            if color[sid] == 0:
                dfs(sid)

        # result is in reverse post-order; reverse it for correct dependency order
        result.reverse()

        confidence = 1.0 if not cycles else max(0.3, 1.0 - 0.2 * len(cycles))
        note = ""
        if cycles:
            note = (
                f"WARNING: {len(cycles)} circular prerequisite chain(s) detected. "
                f"Learning order may be approximate. Review ontology."
            )
            logger.warning(note)

        return TopologicalResult(
            order=result,
            cycles_detected=cycles,
            confidence=confidence,
            note=note,
        )

    def order_by_difficulty(
        self, skill_ids: List[str]
    ) -> List[str]:
        """
        Order skills by difficulty (ascending) as a fallback when
        prerequisite data is incomplete.
        """
        def diff(sid: str) -> int:
            skill = self._ontology.get_by_id(sid)
            return skill.difficulty if skill else 3

        return sorted(skill_ids, key=diff)

    # ── Learning stage grouping ────────────────────────────────────────────────

    def group_into_stages(
        self, skill_ids: List[str]
    ) -> Dict[str, List[str]]:
        """
        Group skills into learning stages based on difficulty and prerequisites.

        Returns:
            {
              "FOUNDATION": [skill_ids with difficulty 1-2],
              "INTERMEDIATE": [difficulty 3],
              "ADVANCED": [difficulty 4-5],
            }
        """
        stages: Dict[str, List[str]] = {
            "FOUNDATION": [],
            "INTERMEDIATE": [],
            "ADVANCED": [],
        }
        topo = self.topological_sort(skill_ids)
        for sid in topo.order:
            skill = self._ontology.get_by_id(sid)
            if not skill:
                stages["INTERMEDIATE"].append(sid)
                continue
            if skill.difficulty <= 2:
                stages["FOUNDATION"].append(sid)
            elif skill.difficulty == 3:
                stages["INTERMEDIATE"].append(sid)
            else:
                stages["ADVANCED"].append(sid)
        return stages


# Module-level singleton
_graph: Optional[SkillGraph] = None


def get_skill_graph() -> SkillGraph:
    global _graph
    if _graph is None:
        _graph = SkillGraph()
    return _graph
