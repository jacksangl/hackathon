# Resume Generation Rules

These rules are mandatory for resume generation and improvement flows.

## Template Structure
- Keep the LaTeX template command structure intact.
- Do not remove required sections.
- Keep output to one page when compiled.

## Subheading Argument Order
- Always use this order for role/education style entries:
  - `\resumeSubheading{<name>}{<date>}{<org_or_degree>}{<location>}`
- Example (education):
  - `\resumeSubheading{The Pennsylvania State University}{May. 2027}{Bachelor of Science in Computer Science}{University Park, PA}`
- Example (experience):
  - `\resumeSubheading{Software Engineer Intern}{May 2026 -- Aug 2026}{Lockheed Martin}{Dallas, Texas}`

## Project Heading Order
- Always use:
  - `\resumeProjectHeading{<project_name_or_stack>}{<date>}`

## Content Rules
- Max 3-4 bullets per header.
- Keep related details in the same entry (for example, GPA must remain inside the same education entry, not split into a separate education item).
- Do not fabricate experience.
- If user says `No experience` for an added skill, do not add a fabricated bullet.

## Added Skill Bullet Quality
- Convert user-provided skill notes into one concise ATS-ready bullet.
- Use AI rewriting for that bullet to improve clarity and impact.
- Avoid placeholder phrasing like: `Applied role-relevant skills by ...`.
