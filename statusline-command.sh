#!/usr/bin/env bash
input=$(cat)
cwd=$(echo "$input" | jq -r '.cwd')

# Truncate directory to last 2 components (mirrors starship truncation_length=2)
dir=$(echo "$cwd" | awk -F'/' '{
  n=NF
  if (n <= 2) { print $0 }
  else { print "…/" $(n-1) "/" $n }
}')

# Git branch
branch=""
if git_branch=$(git -C "$cwd" symbolic-ref --short HEAD 2>/dev/null); then
  branch=" $git_branch"
fi

# Git status indicators (mirrors starship git_status format)
git_status_flags=""
if [ -n "$branch" ]; then
  # Count ahead/behind
  upstream=$(git -C "$cwd" rev-parse --abbrev-ref "@{upstream}" 2>/dev/null)
  if [ -n "$upstream" ]; then
    ahead=$(git -C "$cwd" rev-list --count "@{upstream}..HEAD" 2>/dev/null || echo 0)
    behind=$(git -C "$cwd" rev-list --count "HEAD..@{upstream}" 2>/dev/null || echo 0)
    if [ "$ahead" -gt 0 ] && [ "$behind" -gt 0 ]; then
      git_status_flags=" ⇕⇡${ahead}⇣${behind}"
    elif [ "$ahead" -gt 0 ]; then
      git_status_flags=" ⇡${ahead}"
    elif [ "$behind" -gt 0 ]; then
      git_status_flags=" ⇣${behind}"
    fi
  fi

  # Untracked, modified, staged, conflicted
  porcelain=$(git -C "$cwd" status --porcelain 2>/dev/null)
  untracked=$(echo "$porcelain" | grep -c "^??" 2>/dev/null || echo 0)
  modified=$(echo "$porcelain" | grep -c "^ M\|^.M" 2>/dev/null || echo 0)
  staged=$(echo "$porcelain" | grep -c "^[MADRC] " 2>/dev/null || echo 0)
  conflicted=$(echo "$porcelain" | grep -c "^UU\|^AA\|^DD" 2>/dev/null || echo 0)

  [ "$untracked" -gt 0 ] && git_status_flags="${git_status_flags} ?"
  [ "$modified" -gt 0 ]  && git_status_flags="${git_status_flags} "
  [ "$staged" -gt 0 ]    && git_status_flags="${git_status_flags} "
  [ "$conflicted" -gt 0 ] && git_status_flags="${git_status_flags} "
fi

# Context window usage
context_info=""
used=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
if [ -n "$used" ]; then
  used_int=$(printf "%.0f" "$used")
  filled=$(( used_int * 10 / 100 ))
  bar=""
  for i in $(seq 1 10); do
    if [ "$i" -le "$filled" ]; then
      bar="${bar}█"
    else
      bar="${bar}░"
    fi
  done
  if [ "$used_int" -le 40 ]; then
    color="\e[92m"
  elif [ "$used_int" -le 70 ]; then
    color="\e[93m"
  else
    color="\e[91m"
  fi
  context_info=" ${color}${bar} ${used_int}%\e[0m"
fi

printf "%s%s%s%b" "$dir" "$branch" "$git_status_flags" "$context_info"
