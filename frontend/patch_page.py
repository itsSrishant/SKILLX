import re

with open('frontend/src/app/page.tsx', 'r') as f:
    content = f.read()

# 1. Add imports at top
import_str = """
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { PartnerLogos } from "@/components/landing/PartnerLogos";
"""
content = content.replace('import Lenis from "lenis";', 'import Lenis from "lenis";\n' + import_str)

# 2. Fix the terminology in FEATURES
content = content.replace('"Live Job Market Scanning"', '"Automated Market Scanning"')
content = content.replace('"Real-Time Course Ingestion"', '"Automated Course Ingestion"')
content = content.replace('"Continuously monitors NCS.gov.in', '"Regularly monitors NCS.gov.in')
content = content.replace('engines execute live', 'engines execute')

# 3. Replace Navbar, Hero, Partner Logos with component calls
# Find the start of the return statement in LandingPage
start_idx = content.find('{/* ── STICKY TOP HEADER NAV BAR ─────────────────────────────────── */}')
end_idx = content.find('{/* ── KILLER NARRATIVE STRIP: The Full Story ──────────────────────────── */}')

replacement = """
      <Navbar scrolled={scrolled} />
      <Hero ref={heroRef} />
      <PartnerLogos />
"""
content = content[:start_idx] + replacement + content[end_idx:]

with open('frontend/src/app/page.tsx', 'w') as f:
    f.write(content)
print("Page patched successfully.")
