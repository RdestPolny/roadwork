#!/bin/sh
# Image edits of a reference painting by Codex (GPT Images in the ChatGPT app): the whole picture stays as painted,
# only the named change is made; the result is saved at the reference's size.
#
#   edit.sh <reference> <outdir> <name> "<what changes>"        -> <outdir>/<name>.png
#   edit.sh --batch <file.tsv> <reference> <outdir> [prefix]    -> one edit per line "name<TAB>change", three at a time
#
# Work files (prompt, Codex log): scratch/painted-assets/<name>/ under the current directory. CODEX overrides the binary.
set -eu
if [ "$1" = "--batch" ]; then
  tsv=$2; ref=$3; out=$4; prefix=${5:-}
  while IFS='	' read -r name change; do [ -n "$name" ] && printf '%s\0%s\0' "$prefix$name" "$change"; done < "$tsv" |
    xargs -0 -n2 -P3 sh "$0" "$ref" "$out"
  exit
fi
ref=$1; out=$2; name=$3; change=$4
codex=${CODEX:-/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex}
dir="scratch/painted-assets/$name"
mkdir -p "$dir" "$out"
ext=${ref##*.}; cp "$ref" "$dir/reference.$ext"
size=$(python3 -I -c "import sys; from PIL import Image; w,h=Image.open(sys.argv[1]).size; print(f'{w}x{h}')" "$ref")
cat > "$dir/prompt.md" <<PROMPT
Use your image generation / editing tool (not code, not a script that draws) to make ONE edit of the attached image
\`reference.$ext\` ($size, a painting of a game scene).

Keep the whole picture identical: the same framing, resolution and aspect ratio ($size), the same people in the same
places and sizes, the same light, the same colour grading and the same painterly realism. Change ONLY this:

$change

Do not add anything else, do not move the camera, do not crop. Save the result as \`$name.png\` in the current working
directory (copy it from wherever the image tool stores it). Do not modify any other file. Reply with the path and size.
PROMPT
"$codex" exec --skip-git-repo-check -s workspace-write -C "$dir" -i "$dir/reference.$ext" -o "$dir/last.txt" - < "$dir/prompt.md" > "$dir/codex.log" 2>&1 || true
test -f "$dir/$name.png" || { echo "no $name.png - see $dir/codex.log (or the newest file in ~/.codex/generated_images/)" >&2; exit 1; }
python3 -I -c "import sys; from PIL import Image; r=Image.open(sys.argv[3]); Image.open(sys.argv[1]).convert('RGB').resize(r.size).save(sys.argv[2])" "$dir/$name.png" "$out/$name.png" "$ref"
echo "$out/$name.png"
