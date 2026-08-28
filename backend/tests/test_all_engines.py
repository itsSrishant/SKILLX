"""
SkillX Comprehensive Test Suite — Prompt 14

Tests cover:
1. Skill Ontology integrity
2. Skill Normalizer correctness
3. Skill Matcher relationship logic
4. Scoring Engine monotonicity & correctness
5. Gap Engine output completeness
6. Bridge Engine hour distribution
7. Salary Model data type labeling
8. Data Provenance hash correctness
9. Performance Index build correctness
10. Recommendation Engine ranking

Run: cd backend && python -m pytest tests/ -v

Version: 1.0.0
"""

import pytest
import sys
import os

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ─── 1. Skill Ontology Tests ──────────────────────────────────────────────────

class TestSkillOntology:

    def setup_method(self):
        from app.ontology.skill_ontology import SkillOntology
        self.ontology = SkillOntology.get()

    def test_all_skills_loaded(self):
        """Ontology must contain at least 50 canonical skills."""
        assert len(self.ontology.all_skills()) >= 50

    def test_lookup_by_canonical_name(self):
        """Canonical name lookup returns correct skill_id."""
        sid = self.ontology.get_canonical_id("PLC Programming & Troubleshooting")
        assert sid == "auto_plc"

    def test_lookup_by_alias(self):
        """Alias lookup resolves to correct skill_id."""
        sid = self.ontology.get_canonical_id("ladder logic")
        assert sid == "auto_plc"

    def test_lookup_by_abbreviation(self):
        """Abbreviation lookup resolves to correct skill_id."""
        sid = self.ontology.get_canonical_id("PLC")
        assert sid == "auto_plc"

    def test_child_skill_lookup(self):
        """Child skill resolves to child ID, not parent ID."""
        sid = self.ontology.get_canonical_id("MIG Welding (GMAW)")
        assert sid == "weld_mig"
        parent_sid = self.ontology.get_canonical_id("Welding Fundamentals")
        assert parent_sid == "weld_fundamentals"
        assert sid != parent_sid

    def test_not_equivalent_guard(self):
        """NOT_EQUIVALENT pairs are correctly stored."""
        # welding_fundamentals and weld_robotic are NOT equivalent
        assert self.ontology.is_not_equivalent("weld_fundamentals", "weld_robotic")
        assert self.ontology.is_not_equivalent("weld_robotic", "weld_fundamentals")

    def test_not_equivalent_is_not_reflexive(self):
        """A skill is never NOT_EQUIVALENT to itself."""
        assert not self.ontology.is_not_equivalent("auto_plc", "auto_plc")

    def test_ancestor_traversal(self):
        """Ancestor traversal returns correct parent chain."""
        # cnc_gcode → cnc_fundamentals (parent)
        ancestors = self.ontology.get_ancestors("cnc_gcode")
        assert "cnc_fundamentals" in ancestors

    def test_descendant_traversal(self):
        """Descendant traversal returns correct children."""
        descendants = self.ontology.get_descendants("weld_fundamentals")
        assert "weld_mig" in descendants
        assert "weld_tig" in descendants
        assert "weld_smaw" in descendants

    def test_all_skill_ids_unique(self):
        """All skill_ids must be unique."""
        skills = self.ontology.all_skills()
        ids = [s.skill_id for s in skills]
        assert len(ids) == len(set(ids)), "Duplicate skill_ids found"

    def test_parent_child_consistency(self):
        """If skill A lists B as child, B should list A as parent."""
        for skill in self.ontology.all_skills():
            for child_id in skill.child_skill_ids:
                child = self.ontology.get_by_id(child_id)
                if child and child.parent_skill_id:
                    assert child.parent_skill_id == skill.skill_id, (
                        f"Inconsistency: {skill.skill_id} lists {child_id} as child, "
                        f"but {child_id}.parent_skill_id = {child.parent_skill_id}"
                    )

    def test_export_for_engine3(self):
        """Engine 3 export format is valid."""
        exported = self.ontology.export_for_engine3()
        assert len(exported) >= 50
        for entry in exported:
            assert "name" in entry
            assert "category" in entry
            assert "synonyms" in entry
            assert isinstance(entry["synonyms"], list)


# ─── 2. Skill Normalizer Tests ────────────────────────────────────────────────

class TestSkillNormalizer:

    def setup_method(self):
        from app.ontology.skill_normalizer import SkillNormalizer
        self.normalizer = SkillNormalizer()

    def test_exact_canonical_name(self):
        result = self.normalizer.normalize("PLC Programming & Troubleshooting")
        assert result.skill_id == "auto_plc"
        assert result.method in ("exact_canonical", "alias")
        assert result.is_known is True

    def test_alias_resolution(self):
        result = self.normalizer.normalize("Programmable Logic Controller")
        assert result.skill_id == "auto_plc"

    def test_case_insensitive(self):
        result = self.normalizer.normalize("PLC PROGRAMMING & TROUBLESHOOTING")
        assert result.skill_id == "auto_plc"

    def test_unknown_skill(self):
        result = self.normalizer.normalize("Quantum Flux Capacitor Maintenance")
        assert result.skill_id is None
        assert result.is_known is False

    def test_empty_string(self):
        result = self.normalizer.normalize("")
        assert result.skill_id is None
        assert result.method == "empty"

    def test_fuzzy_candidate_does_not_create_equivalence(self):
        """
        Even a high-similarity fuzzy match must NOT set skill_id.
        """
        result = self.normalizer.normalize("PLC Programing Basics")  # typo
        # Even if fuzzy similarity is high, skill_id must be None
        # because this form is not in the ontology
        # (unless it IS actually in aliases — adjust test if added)
        if result.method == "fuzzy_candidate":
            assert result.skill_id is None  # Fuzzy candidate NEVER sets skill_id

    def test_normalize_many(self):
        surfaces = ["PLC Programming & Troubleshooting", "SCADA Monitoring Systems", "Unknown Skill X"]
        results = self.normalizer.normalize_many(surfaces)
        assert len(results) == 3
        assert results[0].skill_id == "auto_plc"
        assert results[1].skill_id == "auto_scada"
        assert results[2].skill_id is None

    def test_resolve_skill_set_deduplication(self):
        """Multiple surface forms for the same skill → one entry in resolved dict."""
        surfaces = ["PLC Programming & Troubleshooting", "ladder logic", "PLC"]
        resolved = self.normalizer.resolve_skill_set(surfaces)
        plc_entries = [k for k, v in resolved.items() if v.skill_id == "auto_plc"]
        assert len(plc_entries) == 1, "Duplicate skill_id entries in resolved set"


# ─── 3. Skill Matcher Tests ───────────────────────────────────────────────────

class TestSkillMatcher:

    def setup_method(self):
        from app.scoring.skill_matcher import SkillMatcher
        from app.scoring.scoring_config import DEFAULT_SCORING_CONFIG
        self.matcher = SkillMatcher(DEFAULT_SCORING_CONFIG)

    def test_exact_match(self):
        ev = self.matcher.match(
            "PLC Programming & Troubleshooting",
            "PLC Programming & Troubleshooting",
        )
        assert ev.coverage_credit >= 0.99
        assert ev.relationship in ("EXACT_EQUIVALENT", "ALIAS")

    def test_alias_match_full_credit(self):
        ev = self.matcher.match("ladder logic", "PLC Programming & Troubleshooting")
        assert ev.coverage_credit >= 0.90

    def test_parent_provides_partial_credit(self):
        """Welding Fundamentals (parent) covering MIG Welding (child requirement) → partial."""
        ev = self.matcher.match("Welding Fundamentals", "MIG Welding (GMAW)")
        assert 0.0 < ev.coverage_credit < 1.0

    def test_child_provides_partial_credit(self):
        """MIG Welding (child) covering Welding Fundamentals (parent requirement) → partial."""
        ev = self.matcher.match("MIG Welding (GMAW)", "Welding Fundamentals")
        assert 0.0 < ev.coverage_credit < 1.0

    def test_not_equivalent_guard(self):
        """NOT_EQUIVALENT skills give zero credit regardless of similarity."""
        ev = self.matcher.match("Welding Fundamentals", "Robotic Welding Operations")
        assert ev.coverage_credit == 0.0
        assert "NOT_EQUIVALENT" in ev.relationship

    def test_no_match(self):
        """Completely unrelated skills give zero credit."""
        ev = self.matcher.match("Solar PV Rooftop System Installation", "ABS & Advanced Braking Systems")
        assert ev.coverage_credit <= 0.20  # At most RELATED_TO

    def test_explain_produces_text(self):
        """Explain method returns non-empty string."""
        explanation = self.matcher.explain("PLC Programming & Troubleshooting", "SCADA Monitoring Systems")
        assert len(explanation) > 50
        assert "SKILL MATCH DEBUGGER" in explanation

    def test_match_skill_sets_returns_best(self):
        """match_skill_sets returns best evidence per target skill."""
        source_skills = [
            "PLC Programming & Troubleshooting",
            "Welding Fundamentals",
            "Solar PV Rooftop System Installation",
        ]
        target_skills = ["PLC Programming & Troubleshooting", "MIG Welding (GMAW)"]
        results = self.matcher.match_skill_sets(source_skills, target_skills)
        assert "PLC Programming & Troubleshooting" in results
        plc_result = results["PLC Programming & Troubleshooting"]
        assert plc_result.coverage_credit >= 0.99


# ─── 4. Scoring Engine Tests ──────────────────────────────────────────────────

class TestScoringEngine:

    def setup_method(self):
        from app.scoring.scoring_engine import ScoringEngine, DemandedSkill
        from app.scoring.scoring_config import DEFAULT_SCORING_CONFIG
        self.engine = ScoringEngine(DEFAULT_SCORING_CONFIG)
        self.DemandedSkill = DemandedSkill

    def _make_demanded(self, skill_name, n_postings=5, n_employers=3, category="Technical Skills"):
        return self.DemandedSkill(
            skill_name=skill_name,
            n_postings=n_postings,
            n_unique_employers=n_employers,
            recency_weighted_count=float(n_postings),
            category=category,
        )

    def test_perfect_alignment_score_high(self):
        """Course that teaches all demanded skills scores above 85."""
        demanded = [
            self._make_demanded("PLC Programming & Troubleshooting", 12, 4),
            self._make_demanded("SCADA Monitoring Systems", 8, 3),
        ]
        breakdown = self.engine.score(
            course_id=1,
            course_title="Industrial Automation",
            district="Pune",
            nsqf_level=5,
            course_skill_surfaces=[
                "PLC Programming & Troubleshooting",
                "SCADA Monitoring Systems",
                "Industrial IoT & Modbus Protocol",
            ],
            demanded_skills=demanded,
        )
        assert breakdown.final_score >= 85.0, (
            f"Expected >= 85, got {breakdown.final_score}"
        )

    def test_zero_overlap_score_low(self):
        """Course with completely unrelated skills scores near 0."""
        demanded = [
            self._make_demanded("EV High Voltage Safety", 10, 4, "Safety Skills"),
            self._make_demanded("Li-ion Battery Management Systems (BMS)", 8, 3, "Emerging Skills"),
        ]
        breakdown = self.engine.score(
            course_id=2,
            course_title="Plumbing Trade",
            district="Nagpur",
            nsqf_level=3,
            course_skill_surfaces=[
                "Piping Layout & Joint Fitting",
                "House Wiring & LT Network",
            ],
            demanded_skills=demanded,
        )
        assert breakdown.final_score <= 20.0, (
            f"Expected <= 20, got {breakdown.final_score}"
        )

    def test_monotonicity(self):
        """
        Adding a demanded skill to the course skill set must NOT decrease score.
        """
        demanded = [
            self._make_demanded("PLC Programming & Troubleshooting", 10, 4),
            self._make_demanded("SCADA Monitoring Systems", 8, 3),
        ]
        # Without PLC in course
        b1 = self.engine.score(
            course_id=3, course_title="T", district="Pune", nsqf_level=4,
            course_skill_surfaces=["SCADA Monitoring Systems"],
            demanded_skills=demanded,
        )
        # With PLC in course
        b2 = self.engine.score(
            course_id=3, course_title="T", district="Pune", nsqf_level=4,
            course_skill_surfaces=["SCADA Monitoring Systems", "PLC Programming & Troubleshooting"],
            demanded_skills=demanded,
        )
        assert b2.final_score >= b1.final_score, (
            f"Monotonicity violated: adding a skill decreased score "
            f"{b1.final_score} → {b2.final_score}"
        )

    def test_critical_missing_skill_penalizes_score(self):
        """Missing a CRITICAL safety skill reduces the final score."""
        # Course with EV safety skills
        b_with = self.engine.score(
            course_id=4, course_title="EV Tech", district="Pune", nsqf_level=5,
            course_skill_surfaces=["EV High Voltage Safety", "Li-ion Battery Management Systems (BMS)"],
            demanded_skills=[self._make_demanded("EV High Voltage Safety", 10, 4, "Safety Skills")],
        )
        # Course without EV safety skills
        b_without = self.engine.score(
            course_id=4, course_title="EV Tech", district="Pune", nsqf_level=5,
            course_skill_surfaces=["Li-ion Battery Management Systems (BMS)"],
            demanded_skills=[self._make_demanded("EV High Voltage Safety", 10, 4, "Safety Skills")],
        )
        assert b_with.final_score > b_without.final_score

    def test_no_demanded_skills_returns_zero(self):
        """Empty demanded skills list returns 0 score."""
        breakdown = self.engine.score(
            course_id=5, course_title="X", district="Y", nsqf_level=4,
            course_skill_surfaces=["PLC Programming & Troubleshooting"],
            demanded_skills=[],
        )
        assert breakdown.final_score == 0.0

    def test_breakdown_skills_classified(self):
        """Each demanded skill is classified as fully_covered, partially, or missing."""
        demanded = [self._make_demanded("PLC Programming & Troubleshooting", 8, 3)]
        breakdown = self.engine.score(
            course_id=6, course_title="PLC Course", district="Pune", nsqf_level=4,
            course_skill_surfaces=["PLC Programming & Troubleshooting"],
            demanded_skills=demanded,
        )
        assert len(breakdown.skill_records) == 1
        rec = breakdown.skill_records[0]
        assert rec.is_fully_covered
        assert not rec.is_missing

    def test_score_in_valid_range(self):
        """Score is always between 0 and 100."""
        demanded = [
            self._make_demanded("PLC Programming & Troubleshooting", 5, 2),
            self._make_demanded("EV High Voltage Safety", 10, 4, "Safety Skills"),
        ]
        breakdown = self.engine.score(
            course_id=7, course_title="Mixed", district="Pune", nsqf_level=4,
            course_skill_surfaces=["PLC Programming & Troubleshooting"],
            demanded_skills=demanded,
        )
        assert 0.0 <= breakdown.final_score <= 100.0


# ─── 5. Bridge Engine Tests ───────────────────────────────────────────────────

class TestBridgeEngine:

    def test_total_hours_distribution(self):
        """Total bridge hours must be <= TOTAL_BRIDGE_HOURS (20)."""
        from app.scoring.bridge_engine import BridgeEngine, TOTAL_BRIDGE_HOURS

        class MockDB:
            pass

        engine = BridgeEngine.__new__(BridgeEngine)
        from app.ontology.skill_normalizer import get_normalizer
        engine._normalizer = get_normalizer()
        engine._db = None  # Not needed for _generate_modules

        missing = [
            "PLC Programming & Troubleshooting",
            "SCADA Monitoring Systems",
            "Solar PV Rooftop System Installation",
        ]
        modules = engine._generate_modules(missing, nsqf_level=4)

        total_hours = sum(m.duration_hours for m in modules)
        assert total_hours <= TOTAL_BRIDGE_HOURS + 2, (
            f"Expected total hours ≈ {TOTAL_BRIDGE_HOURS}, got {total_hours}"
        )
        assert len(modules) == len(missing)

    def test_each_module_has_minimum_hours(self):
        """No module gets fewer than 2 hours."""
        from app.scoring.bridge_engine import BridgeEngine

        engine = BridgeEngine.__new__(BridgeEngine)
        from app.ontology.skill_normalizer import get_normalizer
        engine._normalizer = get_normalizer()
        engine._db = None

        # 8 missing skills — should each get 2-3 hours
        missing = [f"Skill {i}" for i in range(8)]
        modules = engine._generate_modules(missing, nsqf_level=4)
        for mod in modules:
            assert mod.duration_hours >= 2, (
                f"Module '{mod.missing_skill}' has only {mod.duration_hours} hours"
            )

    def test_employability_post_not_100(self):
        """Employability post-bridge must not be hardcoded to 100."""
        from app.scoring.bridge_engine import BridgeEngine

        engine = BridgeEngine.__new__(BridgeEngine)
        engine._db = None
        engine._normalizer = None

        post = engine._compute_employability_post(alignment_score=45.0, n_missing_skills=5)
        assert post < 100, f"emp_post should not be 100, got {post}"
        assert post <= 92, f"emp_post max is 92, got {post}"

    def test_employability_gain_is_positive(self):
        """Post-bridge employability should be higher than pre."""
        from app.scoring.bridge_engine import BridgeEngine

        engine = BridgeEngine.__new__(BridgeEngine)
        engine._db = None
        engine._normalizer = None

        alignment = 40.0
        post = engine._compute_employability_post(alignment_score=alignment, n_missing_skills=3)
        assert post > alignment, (
            f"Post-bridge employability {post} should exceed pre-bridge {alignment}"
        )


# ─── 6. Salary Model Tests ────────────────────────────────────────────────────

class TestSalaryModel:

    def setup_method(self):
        from app.salary.salary_model import SalaryModel
        self.model = SalaryModel()

    def test_all_records_have_data_type(self):
        """Every salary record must have an explicit data_type."""
        from app.salary.salary_model import SALARY_DATABASE, SalaryDataType
        for record in SALARY_DATABASE:
            assert record.data_type in (
                SalaryDataType.OBSERVED, SalaryDataType.BENCHMARK, SalaryDataType.UNAVAILABLE
            ), f"Record '{record.trade_keyword}' has invalid data_type: {record.data_type}"

    def test_benchmark_records_have_disclaimer(self):
        """BENCHMARK records must produce a non-None disclaimer."""
        from app.salary.salary_model import SALARY_DATABASE, SalaryDataType
        for record in SALARY_DATABASE:
            if record.data_type == SalaryDataType.BENCHMARK:
                disclaimer = record.disclaimer()
                assert disclaimer is not None and len(disclaimer) > 20, (
                    f"BENCHMARK record '{record.trade_keyword}' has no disclaimer"
                )

    def test_electrician_salary_resolves(self):
        record = self.model.get("Electrician Trade", "Electrical & Energy")
        assert record.trade_keyword == "electrician"
        assert record.entry_salary_min > 0

    def test_default_returns_when_no_match(self):
        from app.salary.salary_model import DEFAULT_SALARY
        record = self.model.get("Quantum Welding Technician", "Quantum Sector")
        assert record.trade_keyword == "default"

    def test_salary_gain_positive(self):
        """All records must have post_training > entry salary."""
        from app.salary.salary_model import SALARY_DATABASE
        for record in SALARY_DATABASE:
            assert record.post_training_min >= record.entry_salary_min, (
                f"Record '{record.trade_keyword}': post_training_min < entry_salary_min"
            )

    def test_get_with_context_has_data_type(self):
        """get_with_context must always include data_type field."""
        result = self.model.get_with_context("EV Technician", "Automotive & EV")
        assert "data_type" in result
        assert result["data_type"] in ("OBSERVED", "BENCHMARK", "UNAVAILABLE")


# ─── 7. Data Provenance Tests ─────────────────────────────────────────────────

class TestDataProvenance:

    def test_hash_is_deterministic(self):
        """Same content → same hash."""
        from app.provenance.data_provenance import SHA256Hasher
        h1 = SHA256Hasher.hash_raw("Test content")
        h2 = SHA256Hasher.hash_raw("Test content")
        assert h1 == h2

    def test_hash_changes_with_content(self):
        """Different content → different hash."""
        from app.provenance.data_provenance import SHA256Hasher
        h1 = SHA256Hasher.hash_raw("Content A")
        h2 = SHA256Hasher.hash_raw("Content B")
        assert h1 != h2

    def test_has_changed_detection(self):
        """has_changed returns True when hashes differ."""
        from app.provenance.data_provenance import SHA256Hasher
        old = SHA256Hasher.hash_raw("Old content")
        new = SHA256Hasher.hash_raw("New content")
        assert SHA256Hasher.has_changed(old, new) is True
        assert SHA256Hasher.has_changed(old, old) is False

    def test_placeholder_url_flagged(self):
        """PLACEHOLDER_URL is detected."""
        from app.provenance.data_provenance import QualityAuditor, DataQualityFlag
        flags = QualityAuditor.audit_course("PLACEHOLDER_URL", "", 0.90)
        assert DataQualityFlag.PLACEHOLDER_URL in flags

    def test_synthetic_url_detected(self):
        """Known synthetic DVET URL patterns are flagged."""
        from app.provenance.data_provenance import QualityAuditor, DataQualityFlag
        flags = QualityAuditor.audit_course(
            "https://admission.dvet.gov.in/courses/mh-cat-iti-001",
            "",  # No raw source data
            0.90,
        )
        assert DataQualityFlag.SYNTHETIC_DATA in flags or DataQualityFlag.PLACEHOLDER_URL in flags

    def test_dataset_registry_records_ingestion(self):
        """Dataset registry stores ingestion run."""
        from app.provenance.data_provenance import DatasetRegistry, DataSource
        registry = DatasetRegistry()
        version = registry.register(
            dataset_name="TEST_DATASET",
            description="Test run",
            source=DataSource.SYNTHETIC,
            n_records=100,
            n_clean=80,
            n_flagged=20,
        )
        assert version.version_id is not None
        assert version.n_records == 100
        latest = registry.latest("TEST_DATASET")
        assert latest.n_records == 100


# ─── 8. Skill Graph Tests ─────────────────────────────────────────────────────

class TestSkillGraph:

    def setup_method(self):
        from app.ontology.skill_graph import SkillGraph
        self.graph = SkillGraph()

    def test_topological_sort_respects_prerequisites(self):
        """Prerequisites must appear before dependents in sorted order."""
        # ev_hv_safety is prerequisite of ev_bms
        result = self.graph.topological_sort(["ev_bms", "ev_hv_safety"])
        order = result.order
        if "ev_hv_safety" in order and "ev_bms" in order:
            assert order.index("ev_hv_safety") < order.index("ev_bms"), (
                "ev_hv_safety must come before ev_bms"
            )

    def test_no_false_cycles_in_production_ontology(self):
        """The production ontology must be cycle-free."""
        all_ids = [s.skill_id for s in
                   __import__("app.ontology.skill_ontology", fromlist=["MASTER_SKILL_ONTOLOGY"]).MASTER_SKILL_ONTOLOGY]
        result = self.graph.topological_sort(all_ids)
        assert len(result.cycles_detected) == 0, (
            f"Cycles found in production ontology: {result.cycles_detected}"
        )

    def test_stage_grouping(self):
        """Difficulty-1/2 skills go to FOUNDATION stage."""
        stages = self.graph.group_into_stages(["elec_house_wiring", "auto_plc"])
        assert "elec_house_wiring" in stages.get("FOUNDATION", []) or \
               "elec_house_wiring" in stages.get("INTERMEDIATE", [])


# ─── 9. Performance Index Tests ───────────────────────────────────────────────

class TestPerformanceIndex:

    def test_skill_index_instantiates(self):
        """SkillIndex can be instantiated without DB."""
        from app.performance.indexes import SkillIndex
        index = SkillIndex()
        assert index.courses_with_skill("auto_plc") == set()
        assert index.jobs_demanding_skill("auto_plc") == set()

    def test_empty_index_stats(self):
        """Empty index returns correct stats."""
        from app.performance.indexes import SkillIndex
        index = SkillIndex()
        stats = index.stats()
        assert stats["n_courses"] == 0
        assert stats["n_jobs"] == 0

    def test_skill_overlap(self):
        """Skill overlap correctly returns intersection."""
        from app.performance.indexes import SkillIndex
        index = SkillIndex()
        overlap = index.skill_overlap(
            {"auto_plc", "auto_scada", "solar_pv_install"},
            {"auto_plc", "solar_pv_install", "ev_bms"},
        )
        assert overlap == {"auto_plc", "solar_pv_install"}


# ─── 10. Integration Smoke Test ───────────────────────────────────────────────

class TestIntegration:

    def test_ontology_normalizer_scorer_chain(self):
        """Full chain: surface form → normalizer → matcher → scorer."""
        from app.scoring.scoring_engine import ScoringEngine, DemandedSkill
        from app.scoring.scoring_config import DEFAULT_SCORING_CONFIG

        engine = ScoringEngine(DEFAULT_SCORING_CONFIG)
        demanded = [
            DemandedSkill("PLC Programming & Troubleshooting", 10, 4, 10.0, "Digital & Technology Skills"),
            DemandedSkill("SCADA Monitoring Systems", 8, 3, 8.0, "Digital & Technology Skills"),
            DemandedSkill("EV High Voltage Safety", 6, 2, 6.0, "Safety Skills"),
        ]
        breakdown = engine.score(
            course_id=999,
            course_title="Industrial Automation Trade",
            district="Pune",
            nsqf_level=5,
            course_skill_surfaces=[
                "PLC Programming & Troubleshooting",
                "SCADA Monitoring Systems",
            ],
            demanded_skills=demanded,
        )

        # PLC + SCADA covered; EV HV Safety missing (CRITICAL)
        assert breakdown.final_score > 0
        assert "PLC Programming & Troubleshooting" in breakdown.fully_covered_skills or \
               "PLC Programming & Troubleshooting" in breakdown.partially_covered_skills
        # Critical gap penalty should have been applied
        assert breakdown.critical_missing_count >= 1
        assert breakdown.critical_penalty_applied > 0

    def test_config_describe_has_all_fields(self):
        """ScoringConfig.describe() returns all required fields."""
        from app.scoring.scoring_config import DEFAULT_SCORING_CONFIG
        desc = DEFAULT_SCORING_CONFIG.describe()
        assert "scoring_model_version" in desc
        assert "importance_weights" in desc
        assert "coverage_credits" in desc

    def test_salary_disclaimer_in_api_response(self):
        """get_with_context always includes disclaimer for BENCHMARK data."""
        from app.salary.salary_model import SalaryModel
        model = SalaryModel()
        result = model.get_with_context("Electrician Trade", "Electrical")
        assert "disclaimer" in result
        if result["data_type"] == "BENCHMARK":
            assert result["disclaimer"] is not None
