from pathlib import Path
from string import Template


PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


def load_prompt_template(name):
    path = PROMPTS_DIR / name
    if not path.exists():
        return None
    return Template(path.read_text(encoding="utf-8"))


def render_prompt(name, **values):
    template = load_prompt_template(name)
    if template is None:
        return None
    return template.safe_substitute(**values)
