#!/bin/sh
# Creates a project with 200 demo skills. Usage: sh make-skills.sh /tmp/demo-project
mkdir -p "$1" && cd "$1" && git init -q
for i in $(seq -w 1 200); do
  mkdir -p ".agents/skills/demo-skill-$i"
  printf -- '---\nname: demo-skill-%s\ndescription: Demo skill %s with a description about as long as a real one, so each row renders like a real skill.\n---\n\nDemo.\n' "$i" "$i" > ".agents/skills/demo-skill-$i/SKILL.md"
done
