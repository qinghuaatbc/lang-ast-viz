import React, { useState } from 'react'
import { useLang } from '../i18n/lang'
import { useMobile } from '../hooks/useMobile'
import CodeBlock from './CodeBlock'

// ─── Data ────────────────────────────────────────────────────────────────────

interface GitTopic {
  id: string
  icon: string
  color: string
  label_zh: string
  label_en: string
  desc_zh: string
  desc_en: string
  diagram: string        // inline SVG string
  code: string
  codeTitle_zh: string
  codeTitle_en: string
  notes_zh: string
  notes_en: string
  details_zh: { term: string; def: string }[]
  details_en: { term: string; def: string }[]
}

const TOPICS: GitTopic[] = [
  {
    id: 'objects',
    icon: '🗃',
    color: '#f78166',
    label_zh: 'Git 对象模型',
    label_en: 'Git Object Model',
    desc_zh: 'Git 是内容寻址存储。所有内容用 SHA-1 哈希存储在 .git/objects/ 目录，共 4 种对象类型。',
    desc_en: 'Git is a content-addressable store. Everything is stored by SHA-1 hash under .git/objects/. There are exactly 4 object types.',
    diagram: `<svg viewBox="0 0 520 260" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:520px">
  <defs>
    <marker id="arrowG" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#888"/>
    </marker>
  </defs>
  <!-- blob -->
  <rect x="10" y="100" width="100" height="52" rx="8" fill="#2d1b4e" stroke="#f78166" strokeWidth="1.5"/>
  <text x="60" y="121" textAnchor="middle" fill="#f78166" fontSize="11" fontWeight="700">blob</text>
  <text x="60" y="138" textAnchor="middle" fill="#ccc" fontSize="9">raw file content</text>
  <text x="60" y="151" textAnchor="middle" fill="#888" fontSize="8">SHA-1 of "blob N\0content"</text>
  <!-- tree -->
  <rect x="160" y="70" width="110" height="68" rx="8" fill="#1a2d1a" stroke="#3fb950" strokeWidth="1.5"/>
  <text x="215" y="92" textAnchor="middle" fill="#3fb950" fontSize="11" fontWeight="700">tree</text>
  <text x="215" y="108" textAnchor="middle" fill="#ccc" fontSize="9">blob sha → filename</text>
  <text x="215" y="122" textAnchor="middle" fill="#ccc" fontSize="9">tree sha → dirname</text>
  <text x="215" y="136" textAnchor="middle" fill="#888" fontSize="8">= directory snapshot</text>
  <!-- commit -->
  <rect x="330" y="40" width="110" height="84" rx="8" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.5"/>
  <text x="385" y="62" textAnchor="middle" fill="#58a6ff" fontSize="11" fontWeight="700">commit</text>
  <text x="385" y="78" textAnchor="middle" fill="#ccc" fontSize="9">tree → root tree</text>
  <text x="385" y="92" textAnchor="middle" fill="#ccc" fontSize="9">parent → prev commit</text>
  <text x="385" y="106" textAnchor="middle" fill="#ccc" fontSize="9">author / committer</text>
  <text x="385" y="118" textAnchor="middle" fill="#888" fontSize="8">message</text>
  <!-- tag -->
  <rect x="330" y="160" width="110" height="68" rx="8" fill="#2d2010" stroke="#f0883e" strokeWidth="1.5"/>
  <text x="385" y="182" textAnchor="middle" fill="#f0883e" fontSize="11" fontWeight="700">tag</text>
  <text x="385" y="198" textAnchor="middle" fill="#ccc" fontSize="9">object → any SHA</text>
  <text x="385" y="212" textAnchor="middle" fill="#ccc" fontSize="9">tagger / message</text>
  <text x="385" y="226" textAnchor="middle" fill="#888" fontSize="8">annotated tag object</text>
  <!-- arrows blob→tree -->
  <line x1="110" y1="126" x2="158" y2="106" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowG)"/>
  <!-- arrows tree→commit -->
  <line x1="270" y1="92" x2="328" y2="88" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowG)"/>
  <!-- arrow tag→commit -->
  <line x1="385" y1="160" x2="385" y2="126" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowG)"/>
  <!-- .git/objects label -->
  <rect x="10" y="220" width="400" height="24" rx="6" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
  <text x="210" y="236" textAnchor="middle" fill="#666" fontSize="10">.git/objects/ab/cdef...  (first 2 hex chars = subdir, rest = filename)</text>
</svg>`,
    code: `# Inspect any git object
git cat-file -t HEAD          # type  → "commit"
git cat-file -p HEAD          # print → tree / parent / author / message

git cat-file -p HEAD^{tree}   # root tree listing
git cat-file -p <blob-sha>    # raw file content

# Manually hash a string (what git does internally)
echo -n "blob 5\0hello" | sha1sum

# Walk the object graph
git rev-parse HEAD            # → full commit SHA
git log --oneline --graph     # visual DAG`,
    codeTitle_zh: '对象检查命令',
    codeTitle_en: 'Object Inspection Commands',
    notes_zh: '每个 Git 对象都是不可变的（immutable）——内容决定哈希，哈希就是地址。同一内容在整个仓库中只存储一次。git gc 把多个松散对象打包成 pack 文件节省空间。',
    notes_en: 'Every git object is immutable — content determines the hash which is the address. Identical content is stored exactly once across the entire repo. git gc packs loose objects into packfiles for efficiency.',
    details_zh: [
      { term: 'blob', def: '原始文件内容。不含文件名，名字存在 tree 里。' },
      { term: 'tree', def: '一层目录的快照：列出 blob（文件）和 subtree（子目录）的 SHA + 名字 + 权限。' },
      { term: 'commit', def: '指向一个 root tree，外加父 commit、作者信息、提交消息。' },
      { term: 'tag', def: '带签名的标签对象，指向任意对象（通常是 commit）。' },
    ],
    details_en: [
      { term: 'blob', def: 'Raw file bytes. No filename — the name lives in the tree.' },
      { term: 'tree', def: 'One directory level: lists blob/tree SHAs with name & mode.' },
      { term: 'commit', def: 'Points to a root tree + parent commit(s), plus author/timestamp/message.' },
      { term: 'tag', def: 'Annotated tag: pointer to any object (usually a commit) with signature.' },
    ],
  },
  {
    id: 'dag',
    icon: '🔀',
    color: '#58a6ff',
    label_zh: '提交 DAG',
    label_en: 'Commit DAG',
    desc_zh: '提交历史是一个有向无环图（DAG）。每个 commit 指向父节点。分支只是指向 commit 的轻量指针（40字节 SHA）。',
    desc_en: 'Commit history is a Directed Acyclic Graph. Each commit points to parent(s). Branches are just lightweight pointers (40-byte SHA) to commits.',
    diagram: `<svg viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:500px">
  <defs>
    <marker id="arrowD" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#666"/>
    </marker>
  </defs>
  <!-- commits: C1 C2 C3 main, C4 feature branch from C2 -->
  <!-- C1 -->
  <circle cx="60" cy="120" r="24" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.8"/>
  <text x="60" y="115" textAnchor="middle" fill="#58a6ff" fontSize="10" fontWeight="700">C1</text>
  <text x="60" y="127" textAnchor="middle" fill="#888" fontSize="8">a1b2c3</text>
  <!-- C2 -->
  <circle cx="180" cy="120" r="24" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.8"/>
  <text x="180" y="115" textAnchor="middle" fill="#58a6ff" fontSize="10" fontWeight="700">C2</text>
  <text x="180" y="127" textAnchor="middle" fill="#888" fontSize="8">d4e5f6</text>
  <!-- C3 -->
  <circle cx="300" cy="120" r="24" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.8"/>
  <text x="300" y="115" textAnchor="middle" fill="#58a6ff" fontSize="10" fontWeight="700">C3</text>
  <text x="300" y="127" textAnchor="middle" fill="#888" fontSize="8">77a8b9</text>
  <!-- C4 feature -->
  <circle cx="300" cy="40" r="24" fill="#1a2d1a" stroke="#3fb950" strokeWidth="1.8"/>
  <text x="300" y="35" textAnchor="middle" fill="#3fb950" fontSize="10" fontWeight="700">C4</text>
  <text x="300" y="47" textAnchor="middle" fill="#888" fontSize="8">cc1122</text>
  <!-- arrows (parent pointers, right-to-left in dag) -->
  <line x1="276" y1="120" x2="206" y2="120" stroke="#666" strokeWidth="1.4" markerEnd="url(#arrowD)"/>
  <line x1="156" y1="120" x2="86"  y2="120" stroke="#666" strokeWidth="1.4" markerEnd="url(#arrowD)"/>
  <line x1="276" y1="52"  x2="206" y2="108" stroke="#666" strokeWidth="1.4" markerEnd="url(#arrowD)"/>
  <!-- branch labels -->
  <rect x="262" y="152" width="76" height="22" rx="5" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.2"/>
  <text x="300" y="167" textAnchor="middle" fill="#58a6ff" fontSize="10" fontWeight="600">main</text>
  <line x1="300" y1="144" x2="300" y2="152" stroke="#58a6ff" strokeWidth="1" strokeDasharray="3,2"/>
  <rect x="262" y="4" width="76" height="22" rx="5" fill="#1a2d1a" stroke="#3fb950" strokeWidth="1.2"/>
  <text x="300" y="19" textAnchor="middle" fill="#3fb950" fontSize="10" fontWeight="600">feature</text>
  <line x1="300" y1="16" x2="300" y2="14" stroke="#3fb950" strokeWidth="1" strokeDasharray="3,2"/>
  <!-- HEAD -->
  <rect x="344" y="108" width="56" height="24" rx="5" fill="#2d1f10" stroke="#f0883e" strokeWidth="1.2"/>
  <text x="372" y="124" textAnchor="middle" fill="#f0883e" fontSize="10" fontWeight="700">HEAD</text>
  <line x1="344" y1="120" x2="326" y2="120" stroke="#f0883e" strokeWidth="1.2" markerEnd="url(#arrowD)"/>
</svg>`,
    code: `# Visualize the DAG
git log --oneline --graph --all --decorate

# What HEAD points to
cat .git/HEAD                 # → ref: refs/heads/main
cat .git/refs/heads/main      # → full commit SHA

# Create / switch branch (just writes a 40-byte file)
git branch feature            # creates .git/refs/heads/feature
git switch feature            # updates .git/HEAD

# Detached HEAD — HEAD points directly to a commit
git checkout a1b2c3           # HEAD = SHA (not a branch name)`,
    codeTitle_zh: 'DAG 与分支',
    codeTitle_en: 'DAG & Branches',
    notes_zh: '分支创建是 O(1)——只写一个包含 SHA 的文件。删除分支不删 commit，只是移除那个指针文件。只要还有任何引用（分支/tag/reflog）指向 commit，它就不会被 gc 清除。',
    notes_en: 'Branch creation is O(1) — just writes a file. Deleting a branch only removes the pointer file. Commits are never deleted as long as any ref (branch/tag/reflog) points to them.',
    details_zh: [
      { term: 'HEAD', def: '工作目录当前位于哪个 commit/branch。通常是 ref: refs/heads/main 这样的间接引用。' },
      { term: 'detached HEAD', def: 'HEAD 直接指向 commit SHA，不指向任何分支名。新的 commit 在切换后会变成孤儿。' },
      { term: 'refs', def: '.git/refs/ 下的文本文件。heads/ 是本地分支，remotes/ 是远程跟踪分支，tags/ 是标签。' },
      { term: 'reflog', def: '.git/logs/ 中记录了 HEAD 和分支的每次变动，用于灾难恢复（git reflog）。' },
    ],
    details_en: [
      { term: 'HEAD', def: 'Where your working tree is. Usually a symbolic ref like "ref: refs/heads/main".' },
      { term: 'detached HEAD', def: 'HEAD points to a commit SHA directly. New commits become orphans after switching.' },
      { term: 'refs', def: 'Plain text files under .git/refs/. heads/ = local branches, remotes/ = remote-tracking, tags/ = tags.' },
      { term: 'reflog', def: '.git/logs/ records every HEAD/branch movement — used for disaster recovery (git reflog).' },
    ],
  },
  {
    id: 'index',
    icon: '📋',
    color: '#d2a8ff',
    label_zh: '暂存区（Index）',
    label_en: 'Staging Area (Index)',
    desc_zh: '暂存区（index）是工作目录和下一次 commit 之间的缓冲层。git add 把文件内容写入 object store，并更新 index。',
    desc_en: 'The index (staging area) sits between your working tree and the next commit. git add writes content to the object store and updates the index.',
    diagram: `<svg viewBox="0 0 480 180" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <defs>
    <marker id="arrowI" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#888"/>
    </marker>
  </defs>
  <!-- Working Tree -->
  <rect x="10" y="50" width="110" height="80" rx="8" fill="#1a1a2e" stroke="#888" strokeWidth="1.4"/>
  <text x="65" y="74" textAnchor="middle" fill="#ccc" fontSize="11" fontWeight="700">Working Tree</text>
  <text x="65" y="90" textAnchor="middle" fill="#888" fontSize="9">file.txt (modified)</text>
  <text x="65" y="104" textAnchor="middle" fill="#888" fontSize="9">new.txt (untracked)</text>
  <!-- Index -->
  <rect x="185" y="50" width="110" height="80" rx="8" fill="#1a1a2e" stroke="#d2a8ff" strokeWidth="1.6"/>
  <text x="240" y="74" textAnchor="middle" fill="#d2a8ff" fontSize="11" fontWeight="700">Index / Stage</text>
  <text x="240" y="90" textAnchor="middle" fill="#888" fontSize="9">blob SHA ↔ path</text>
  <text x="240" y="104" textAnchor="middle" fill="#888" fontSize="9">.git/index (binary)</text>
  <!-- Repository -->
  <rect x="360" y="50" width="110" height="80" rx="8" fill="#1a1a2e" stroke="#58a6ff" strokeWidth="1.4"/>
  <text x="415" y="74" textAnchor="middle" fill="#58a6ff" fontSize="11" fontWeight="700">Repository</text>
  <text x="415" y="90" textAnchor="middle" fill="#888" fontSize="9">objects/ (blobs)</text>
  <text x="415" y="104" textAnchor="middle" fill="#888" fontSize="9">commits / trees</text>
  <!-- arrows -->
  <line x1="122" y1="90" x2="183" y2="90" stroke="#3fb950" strokeWidth="1.5" markerEnd="url(#arrowI)"/>
  <text x="152" y="82" textAnchor="middle" fill="#3fb950" fontSize="9">git add</text>
  <line x1="297" y1="90" x2="358" y2="90" stroke="#58a6ff" strokeWidth="1.5" markerEnd="url(#arrowI)"/>
  <text x="327" y="82" textAnchor="middle" fill="#58a6ff" fontSize="9">git commit</text>
  <!-- reverse: checkout -->
  <line x1="358" y1="100" x2="183" y2="100" stroke="#f0883e" strokeWidth="1" strokeDasharray="4,2" markerEnd="url(#arrowI)"/>
  <text x="270" y="148" textAnchor="middle" fill="#f0883e" fontSize="9">git restore / checkout</text>
  <!-- git diff labels -->
  <text x="152" y="165" textAnchor="middle" fill="#888" fontSize="9">git diff (unstaged)</text>
  <text x="327" y="165" textAnchor="middle" fill="#888" fontSize="9">git diff --cached (staged)</text>
</svg>`,
    code: `# Three-zone diff
git diff            # working tree vs index (unstaged changes)
git diff --cached   # index vs HEAD (staged changes)
git diff HEAD       # working tree vs HEAD (all changes)

# Partial staging (interactive)
git add -p          # stage hunks selectively

# Unstage without losing changes
git restore --staged file.txt   # remove from index, keep in worktree

# What's in the index right now
git ls-files --stage            # SHA + mode + path for every entry`,
    codeTitle_zh: '暂存区操作',
    codeTitle_en: 'Index Operations',
    notes_zh: 'git add 实际做了两件事：1. 把文件内容写成 blob 对象到 .git/objects/；2. 更新 .git/index 里对应条目的 SHA。git commit 再把 index 快照成 tree 对象，然后创建 commit。',
    notes_en: 'git add does two things: 1. writes file content as a blob to .git/objects/; 2. updates the SHA entry in .git/index. git commit then snapshots the index into a tree object and creates the commit.',
    details_zh: [
      { term: 'git add -p', def: '块（hunk）级别的交互式暂存，可以只把一个文件中的部分修改加入 stage。' },
      { term: 'git stash', def: '把 index 和工作目录的修改临时保存为特殊的 commit 栈（stash@{0}、stash@{1}...）。' },
      { term: 'git restore', def: '替代旧的 git checkout 用于文件恢复。--staged 恢复 index，不加则恢复工作目录。' },
      { term: '.git/index', def: '二进制文件，存储 staged 文件的 SHA + 路径 + 权限 + 时间戳缓存（stat cache）。' },
    ],
    details_en: [
      { term: 'git add -p', def: 'Interactive hunk-level staging — add only part of a file\'s changes to the index.' },
      { term: 'git stash', def: 'Saves index + working tree changes as a special commit stack (stash@{0}, stash@{1}...).' },
      { term: 'git restore', def: 'Replaces old "git checkout" for file restore. --staged resets index; without: resets worktree.' },
      { term: '.git/index', def: 'Binary file storing SHA + path + mode + stat-cache timestamps for every staged entry.' },
    ],
  },
  {
    id: 'merge',
    icon: '🔁',
    color: '#3fb950',
    label_zh: 'Merge vs Rebase',
    label_en: 'Merge vs Rebase',
    desc_zh: 'merge 保留历史分叉（创建 merge commit），rebase 重写历史使之线性（移植 commit 到新基点）。两者最终内容相同，历史形状不同。',
    desc_en: 'Merge preserves divergent history (creates a merge commit). Rebase rewrites history by replanting commits onto a new base. Same final content, different history shape.',
    diagram: `<svg viewBox="0 0 500 240" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:500px">
  <defs>
    <marker id="arrowM" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#666"/>
    </marker>
  </defs>
  <!-- MERGE side -->
  <text x="120" y="20" textAnchor="middle" fill="#ccc" fontSize="12" fontWeight="700">git merge feature</text>
  <!-- main line: A B C M -->
  <circle cx="30"  cy="70" r="16" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.5"/>
  <text x="30"  cy="74" textAnchor="middle" fill="#58a6ff" fontSize="10" dominantBaseline="middle">A</text>
  <circle cx="100" cy="70" r="16" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.5"/>
  <text x="100" cy="74" textAnchor="middle" fill="#58a6ff" fontSize="10" dominantBaseline="middle">B</text>
  <circle cx="170" cy="70" r="16" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.5"/>
  <text x="170" cy="74" textAnchor="middle" fill="#58a6ff" fontSize="10" dominantBaseline="middle">C</text>
  <circle cx="240" cy="70" r="16" fill="#1a1f2d" stroke="#f0883e" strokeWidth="1.8"/>
  <text x="240" cy="74" textAnchor="middle" fill="#f0883e" fontSize="10" dominantBaseline="middle">M</text>
  <!-- feature branch: D E -->
  <circle cx="100" cy="140" r="16" fill="#1a2d1a" stroke="#3fb950" strokeWidth="1.5"/>
  <text x="100" cy="144" textAnchor="middle" fill="#3fb950" fontSize="10" dominantBaseline="middle">D</text>
  <circle cx="170" cy="140" r="16" fill="#1a2d1a" stroke="#3fb950" strokeWidth="1.5"/>
  <text x="170" cy="144" textAnchor="middle" fill="#3fb950" fontSize="10" dominantBaseline="middle">E</text>
  <!-- arrows main -->
  <line x1="86"  y1="70" x2="46"  y2="70" stroke="#666" strokeWidth="1.2" markerEnd="url(#arrowM)"/>
  <line x1="156" y1="70" x2="116" y2="70" stroke="#666" strokeWidth="1.2" markerEnd="url(#arrowM)"/>
  <line x1="224" y1="70" x2="186" y2="70" stroke="#666" strokeWidth="1.2" markerEnd="url(#arrowM)"/>
  <!-- arrows feature -->
  <line x1="86"  y1="140" x2="46"  y2="76" stroke="#666" strokeWidth="1.2" markerEnd="url(#arrowM)"/>
  <line x1="156" y1="140" x2="116" y2="140" stroke="#666" strokeWidth="1.2" markerEnd="url(#arrowM)"/>
  <!-- merge commit arrows -->
  <line x1="224" y1="78" x2="186" y2="134" stroke="#f0883e" strokeWidth="1.2" markerEnd="url(#arrowM)"/>
  <text x="70"  y="168" fill="#888" fontSize="9" textAnchor="middle">non-linear, preserves all</text>

  <!-- REBASE side -->
  <text x="385" y="20" textAnchor="middle" fill="#ccc" fontSize="12" fontWeight="700">git rebase main</text>
  <!-- main: A B C -->
  <circle cx="290" cy="70" r="16" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.5"/>
  <text x="290" cy="74" textAnchor="middle" fill="#58a6ff" fontSize="10" dominantBaseline="middle">A</text>
  <circle cx="350" cy="70" r="16" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.5"/>
  <text x="350" cy="74" textAnchor="middle" fill="#58a6ff" fontSize="10" dominantBaseline="middle">B</text>
  <circle cx="410" cy="70" r="16" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.5"/>
  <text x="410" cy="74" textAnchor="middle" fill="#58a6ff" fontSize="10" dominantBaseline="middle">C</text>
  <!-- replayed: D' E' -->
  <circle cx="470" cy="70" r="16" fill="#1a2d1a" stroke="#3fb950" strokeWidth="1.8"/>
  <text x="470" cy="74" textAnchor="middle" fill="#3fb950" fontSize="10" dominantBaseline="middle">D'</text>
  <!-- E' needs more space, put on next row -->
  <!-- ghost D E (original, faded) -->
  <circle cx="350" cy="140" r="16" fill="none" stroke="#3fb950" strokeWidth="1" opacity="0.3"/>
  <text x="350" cy="144" textAnchor="middle" fill="#3fb950" fontSize="10" opacity="0.3" dominantBaseline="middle">D</text>
  <circle cx="410" cy="140" r="16" fill="none" stroke="#3fb950" strokeWidth="1" opacity="0.3"/>
  <text x="410" cy="144" textAnchor="middle" fill="#3fb950" fontSize="10" opacity="0.3" dominantBaseline="middle">E</text>
  <!-- arrows main rebase -->
  <line x1="336" y1="70" x2="306" y2="70" stroke="#666" strokeWidth="1.2" markerEnd="url(#arrowM)"/>
  <line x1="396" y1="70" x2="366" y2="70" stroke="#666" strokeWidth="1.2" markerEnd="url(#arrowM)"/>
  <line x1="454" y1="70" x2="426" y2="70" stroke="#666" strokeWidth="1.2" markerEnd="url(#arrowM)"/>
  <text x="380" y="200" fill="#888" fontSize="9" textAnchor="middle">linear history, new SHAs</text>
  <text x="380" y="215" fill="#888" fontSize="9" textAnchor="middle">(D', E' = D, E replanted)</text>
</svg>`,
    code: `# --- Merge ---
git switch main
git merge feature             # creates merge commit M with 2 parents
git merge --no-ff feature     # always create merge commit (no fast-forward)
git merge --squash feature    # squash all feature commits into one staged change

# --- Rebase ---
git switch feature
git rebase main               # replay feature commits on top of main
git rebase -i HEAD~3          # interactive: reorder/squash/edit/drop commits
git rebase --onto main A B    # transplant commits A..B onto main

# After rebase, update remote (rewrites history — requires force)
git push --force-with-lease   # safer force push (fails if remote changed)`,
    codeTitle_zh: 'Merge 与 Rebase 命令',
    codeTitle_en: 'Merge & Rebase Commands',
    notes_zh: '黄金法则：不要 rebase 已推送到公共分支的 commit，因为会改变 SHA，其他人的本地历史会出现冲突。本地未推送的 feature 分支可以自由 rebase。--force-with-lease 比 --force 更安全：若远程有别人的新提交则会失败。',
    notes_en: 'Golden rule: never rebase commits already pushed to a public branch — it changes SHAs and everyone else gets conflicts. Local unpushed feature branches are safe to rebase freely. --force-with-lease is safer than --force: it fails if the remote has new commits from others.',
    details_zh: [
      { term: 'fast-forward', def: '当 main 没有新提交时，merge 只移动 main 指针到 feature tip——没有 merge commit。' },
      { term: 'merge conflict', def: '两个分支修改了同一行，Git 无法自动解决，在文件中插入 <<<<<<< 标记。' },
      { term: 'interactive rebase', def: 'git rebase -i 可以对每个 commit 执行 pick/squash/fixup/reword/drop/edit。' },
      { term: 'cherry-pick', def: '把某个特定 commit 的改动应用到当前分支，等于针对单个 commit 的 rebase。' },
    ],
    details_en: [
      { term: 'fast-forward', def: 'When main has no new commits, merge just moves the pointer to feature tip — no merge commit.' },
      { term: 'merge conflict', def: 'Both branches modified the same line; Git inserts <<<<<<< markers for manual resolution.' },
      { term: 'interactive rebase', def: 'git rebase -i lets you pick/squash/fixup/reword/drop/edit each commit.' },
      { term: 'cherry-pick', def: 'Apply a specific commit\'s diff onto the current branch — a single-commit rebase.' },
    ],
  },
  {
    id: 'remotes',
    icon: '🌐',
    color: '#f0883e',
    label_zh: '远程与同步',
    label_en: 'Remotes & Sync',
    desc_zh: '远程仓库是同一 DAG 的另一份副本。remote-tracking 分支（origin/main）是本地只读快照，fetch 更新它们，push/pull 同步改动。',
    desc_en: 'Remotes are another copy of the same DAG. Remote-tracking branches (origin/main) are local read-only snapshots. fetch updates them; push/pull sync changes.',
    diagram: `<svg viewBox="0 0 480 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <defs>
    <marker id="arrowR" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#888"/>
    </marker>
  </defs>
  <!-- Local repo box -->
  <rect x="10" y="30" width="200" height="140" rx="10" fill="rgba(255,255,255,0.03)" stroke="#444" strokeWidth="1.2"/>
  <text x="110" y="52" textAnchor="middle" fill="#aaa" fontSize="11" fontWeight="700">Local Repo</text>
  <!-- local commits -->
  <circle cx="50"  cy="90" r="16" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.5"/>
  <text x="50"  cy="90" textAnchor="middle" fill="#58a6ff" fontSize="9" dominantBaseline="middle">A</text>
  <circle cx="100" cy="90" r="16" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.5"/>
  <text x="100" cy="90" textAnchor="middle" fill="#58a6ff" fontSize="9" dominantBaseline="middle">B</text>
  <circle cx="150" cy="90" r="16" fill="#1a2d1a" stroke="#3fb950" strokeWidth="1.5"/>
  <text x="150" cy="90" textAnchor="middle" fill="#3fb950" fontSize="9" dominantBaseline="middle">C</text>
  <line x1="84" y1="90" x2="66" y2="90" stroke="#666" strokeWidth="1.2" markerEnd="url(#arrowR)"/>
  <line x1="134" y1="90" x2="116" y2="90" stroke="#666" strokeWidth="1.2" markerEnd="url(#arrowR)"/>
  <!-- tracking label -->
  <rect x="30" y="118" width="80" height="18" rx="4" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1"/>
  <text x="70" y="131" textAnchor="middle" fill="#58a6ff" fontSize="8">origin/main → B</text>
  <rect x="118" y="118" width="52" height="18" rx="4" fill="#1a2d1a" stroke="#3fb950" strokeWidth="1"/>
  <text x="144" y="131" textAnchor="middle" fill="#3fb950" fontSize="8">main → C</text>
  <!-- Remote repo box -->
  <rect x="270" y="30" width="200" height="140" rx="10" fill="rgba(255,255,255,0.03)" stroke="#444" strokeWidth="1.2"/>
  <text x="370" y="52" textAnchor="middle" fill="#aaa" fontSize="11" fontWeight="700">Remote (origin)</text>
  <circle cx="310" cy="90" r="16" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.5"/>
  <text x="310" cy="90" textAnchor="middle" fill="#58a6ff" fontSize="9" dominantBaseline="middle">A</text>
  <circle cx="360" cy="90" r="16" fill="#1a1f2d" stroke="#58a6ff" strokeWidth="1.5"/>
  <text x="360" cy="90" textAnchor="middle" fill="#58a6ff" fontSize="9" dominantBaseline="middle">B</text>
  <line x1="344" y1="90" x2="326" y2="90" stroke="#666" strokeWidth="1.2" markerEnd="url(#arrowR)"/>
  <!-- arrows between -->
  <line x1="210" y1="78" x2="268" y2="78" stroke="#f0883e" strokeWidth="1.5" markerEnd="url(#arrowR)"/>
  <text x="239" y="72" textAnchor="middle" fill="#f0883e" fontSize="9">push C</text>
  <line x1="268" y1="102" x2="210" y2="102" stroke="#3fb950" strokeWidth="1.5" markerEnd="url(#arrowR)"/>
  <text x="239" y="116" textAnchor="middle" fill="#3fb950" fontSize="9">fetch / pull</text>
</svg>`,
    code: `# Fetch — update remote-tracking refs, don't touch local branches
git fetch origin              # download new objects + update origin/main etc.
git fetch --all               # fetch all remotes

# Pull = fetch + merge (or rebase with --rebase)
git pull origin main          # fetch + merge
git pull --rebase             # fetch + rebase (cleaner history)

# Push
git push origin main          # push local main → remote main
git push -u origin feature    # push + set upstream tracking

# See remote-tracking branches
git branch -r                 # list remotes
git log origin/main..HEAD     # commits ahead of remote

# Prune stale remote-tracking refs
git fetch --prune             # remove origin/deleted-branch`,
    codeTitle_zh: '远程同步命令',
    codeTitle_en: 'Remote Sync Commands',
    notes_zh: 'git fetch 永远安全——只下载数据，不修改本地分支。git pull 相当于 fetch + merge，有时会产生不必要的 merge commit。团队通常推荐 git pull --rebase 保持线性历史。',
    notes_en: 'git fetch is always safe — it only downloads data without touching local branches. git pull = fetch + merge, which can create unnecessary merge commits. Teams often prefer git pull --rebase for linear history.',
    details_zh: [
      { term: 'origin', def: '默认远程名称（只是一个约定）。对应 .git/config 里的 [remote "origin"] 配置。' },
      { term: 'tracking branch', def: 'origin/main 是 origin 上 main 分支的本地快照，只有 fetch 才更新它。' },
      { term: 'upstream', def: 'git push -u 设置 upstream，之后直接 git push/pull 不需要指定 remote 和 branch。' },
      { term: 'git clone', def: '=下载仓库 + 创建 origin 远程 + checkout 默认分支。所有历史都在本地。' },
    ],
    details_en: [
      { term: 'origin', def: 'Default remote name (just a convention). Defined in .git/config as [remote "origin"].' },
      { term: 'tracking branch', def: 'origin/main is a local snapshot of the remote\'s main — only fetch updates it.' },
      { term: 'upstream', def: 'git push -u sets upstream so future git push/pull need no remote/branch arguments.' },
      { term: 'git clone', def: '= download repo + create origin remote + checkout default branch. Full history is local.' },
    ],
  },
  {
    id: 'stash',
    icon: '📦',
    color: '#79c0ff',
    label_zh: 'Stash & 临时保存',
    label_en: 'Stash & Temporary Save',
    desc_zh: 'git stash 把当前未提交的修改保存为特殊 commit 栈，清空工作目录，方便切换任务。',
    desc_en: 'git stash saves uncommitted changes as a special commit stack, cleans the working tree, so you can switch tasks cleanly.',
    diagram: `<svg viewBox="0 0 460 180" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:460px">
  <defs>
    <marker id="arrowS" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#888"/>
    </marker>
  </defs>
  <!-- Working tree -->
  <rect x="10" y="30" width="120" height="70" rx="8" fill="#1a1a2e" stroke="#888" strokeWidth="1.2"/>
  <text x="70" y="55" textAnchor="middle" fill="#ccc" fontSize="11">Working Tree</text>
  <text x="70" y="72" textAnchor="middle" fill="#f0883e" fontSize="9">WIP changes...</text>
  <!-- Stash stack -->
  <rect x="170" y="20" width="130" height="30" rx="6" fill="#1c1c2e" stroke="#79c0ff" strokeWidth="1.4"/>
  <text x="235" y="40" textAnchor="middle" fill="#79c0ff" fontSize="10">stash@{0} (latest)</text>
  <rect x="170" y="55" width="130" height="30" rx="6" fill="#1a1a2e" stroke="#79c0ff" strokeWidth="1" opacity="0.7"/>
  <text x="235" y="75" textAnchor="middle" fill="#79c0ff" fontSize="10" opacity="0.7">stash@{1}</text>
  <rect x="170" y="90" width="130" height="30" rx="6" fill="#1a1a2e" stroke="#79c0ff" strokeWidth="1" opacity="0.4"/>
  <text x="235" y="110" textAnchor="middle" fill="#79c0ff" fontSize="10" opacity="0.4">stash@{2}</text>
  <!-- label Stash stack -->
  <text x="235" y="145" textAnchor="middle" fill="#888" fontSize="9">Stash stack (.git/refs/stash)</text>
  <!-- arrows -->
  <line x1="132" y1="55" x2="168" y2="38" stroke="#79c0ff" strokeWidth="1.4" markerEnd="url(#arrowS)"/>
  <text x="148" y="40" fill="#79c0ff" fontSize="9">stash</text>
  <line x1="168" y1="50" x2="132" y2="60" stroke="#3fb950" strokeWidth="1.4" markerEnd="url(#arrowS)" strokeDasharray="4,2"/>
  <text x="148" y="68" fill="#3fb950" fontSize="9">pop/apply</text>
  <!-- Clean tree -->
  <rect x="340" y="30" width="110" height="70" rx="8" fill="#1a1a2e" stroke="#3fb950" strokeWidth="1.2"/>
  <text x="395" y="55" textAnchor="middle" fill="#ccc" fontSize="11">Working Tree</text>
  <text x="395" y="72" textAnchor="middle" fill="#3fb950" fontSize="9">clean ✓</text>
  <line x1="302" y1="65" x2="338" y2="65" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowS)"/>
  <text x="320" y="58" textAnchor="middle" fill="#888" fontSize="9">after stash</text>
</svg>`,
    code: `# Stash current changes
git stash                     # stash tracked file changes
git stash -u                  # include untracked files too
git stash push -m "WIP: auth refactor"   # with a label

# View and restore stash
git stash list                # stash@{0}: WIP on main: a1b2 msg
git stash show -p             # show diff of latest stash
git stash pop                 # apply stash@{0} and drop it
git stash apply stash@{2}     # apply without dropping

# Clean up
git stash drop stash@{1}      # delete a stash
git stash clear               # delete ALL stashes (irreversible)

# Stash only staged changes
git stash --staged            # stash only the index`,
    codeTitle_zh: 'Stash 命令',
    codeTitle_en: 'Stash Commands',
    notes_zh: 'stash 内部是两个 commit（一个存 index，一个存工作目录），通过 stash stack 引用。pop = apply + drop。stash clear 之后数据仍在 object store 中，直到 git gc 运行（可用 git reflog stash 找回）。',
    notes_en: 'A stash is two commits internally (one for the index, one for the worktree), linked via the stash ref stack. pop = apply + drop. After stash clear, data is still in the object store until gc runs (git reflog stash can recover).',
    details_zh: [
      { term: 'stash@{0}', def: '栈顶（最新的）stash。数字越大越早。' },
      { term: 'git stash branch', def: '从 stash 创建新分支：git stash branch newbranch stash@{1}' },
      { term: 'apply vs pop', def: 'apply 应用后保留 stash 在栈上，pop 应用后删除它。' },
      { term: 'partial stash', def: 'git stash -p 交互式选择哪些 hunk 进入 stash。' },
    ],
    details_en: [
      { term: 'stash@{0}', def: 'Top of stash stack (most recent). Higher index = older.' },
      { term: 'git stash branch', def: 'Create a branch from a stash: git stash branch newbranch stash@{1}' },
      { term: 'apply vs pop', def: 'apply keeps the stash on the stack; pop applies and removes it.' },
      { term: 'partial stash', def: 'git stash -p interactively selects which hunks go into the stash.' },
    ],
  },
  {
    id: 'reset',
    icon: '⏪',
    color: '#f78166',
    label_zh: 'Reset & Reflog',
    label_en: 'Reset & Reflog',
    desc_zh: 'git reset 移动 HEAD 和分支指针，影响范围取决于 --soft/--mixed/--hard。git reflog 记录所有 HEAD 变动，是灾难恢复的救命稻草。',
    desc_en: 'git reset moves HEAD and the branch pointer; scope depends on --soft/--mixed/--hard. git reflog records every HEAD movement — the ultimate recovery tool.',
    diagram: `<svg viewBox="0 0 480 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <defs>
    <marker id="arrowRE" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#888"/>
    </marker>
  </defs>
  <!-- Reset modes table -->
  <rect x="10" y="10" width="460" height="165" rx="8" fill="rgba(255,255,255,0.03)" stroke="#333" strokeWidth="1"/>
  <text x="240" y="34" textAnchor="middle" fill="#ccc" fontSize="12" fontWeight="700">git reset HEAD~1 modes</text>
  <!-- header -->
  <rect x="20" y="44" width="440" height="24" rx="4" fill="rgba(255,255,255,0.06)"/>
  <text x="100" y="60" textAnchor="middle" fill="#888" fontSize="10" fontWeight="700">Mode</text>
  <text x="220" y="60" textAnchor="middle" fill="#888" fontSize="10" fontWeight="700">HEAD / Branch</text>
  <text x="330" y="60" textAnchor="middle" fill="#888" fontSize="10" fontWeight="700">Index (staged)</text>
  <text x="430" y="60" textAnchor="middle" fill="#888" fontSize="10" fontWeight="700">Working Tree</text>
  <!-- soft -->
  <text x="100" y="88" textAnchor="middle" fill="#3fb950" fontSize="10" fontWeight="700">--soft</text>
  <text x="220" y="88" textAnchor="middle" fill="#ccc" fontSize="10">moves back</text>
  <text x="330" y="88" textAnchor="middle" fill="#f0883e" fontSize="10">unchanged</text>
  <text x="430" y="88" textAnchor="middle" fill="#f0883e" fontSize="10">unchanged</text>
  <!-- mixed -->
  <text x="100" y="118" textAnchor="middle" fill="#79c0ff" fontSize="10" fontWeight="700">--mixed (default)</text>
  <text x="220" y="118" textAnchor="middle" fill="#ccc" fontSize="10">moves back</text>
  <text x="330" y="118" textAnchor="middle" fill="#ccc" fontSize="10">reset</text>
  <text x="430" y="118" textAnchor="middle" fill="#f0883e" fontSize="10">unchanged</text>
  <!-- hard -->
  <text x="100" y="148" textAnchor="middle" fill="#f78166" fontSize="10" fontWeight="700">--hard</text>
  <text x="220" y="148" textAnchor="middle" fill="#ccc" fontSize="10">moves back</text>
  <text x="330" y="148" textAnchor="middle" fill="#ccc" fontSize="10">reset</text>
  <text x="430" y="148" textAnchor="middle" fill="#ccc" fontSize="10">reset ⚠</text>
  <!-- dividers -->
  <line x1="160" y1="44" x2="160" y2="165" stroke="#333" strokeWidth="0.8"/>
  <line x1="275" y1="44" x2="275" y2="165" stroke="#333" strokeWidth="0.8"/>
  <line x1="385" y1="44" x2="385" y2="165" stroke="#333" strokeWidth="0.8"/>
  <line x1="20"  y1="98" x2="460" y2="98"  stroke="#333" strokeWidth="0.8"/>
  <line x1="20"  y1="128" x2="460" y2="128" stroke="#333" strokeWidth="0.8"/>
</svg>`,
    code: `# --- Reset ---
git reset --soft  HEAD~1    # undo last commit, keep changes staged
git reset --mixed HEAD~1    # undo last commit, unstage (default)
git reset --hard  HEAD~1    # undo last commit, discard ALL changes ⚠

git reset --hard origin/main  # discard local and match remote exactly

# --- Reflog (safety net) ---
git reflog                  # every HEAD movement with timestamp
git reflog show main        # reflog for a specific branch

# Recover a "lost" commit
git reflog                  # find the SHA before reset
git reset --hard a1b2c3     # go back
git checkout -b recover a1b2c3  # or create a branch from it

# Revert (safe alternative — creates new commit)
git revert HEAD             # undo last commit by adding inverse commit
git revert a1b2c3           # revert a specific commit`,
    codeTitle_zh: 'Reset 与 Reflog 命令',
    codeTitle_en: 'Reset & Reflog Commands',
    notes_zh: '--hard 会永久丢失工作目录改动（未提交），但 commit 对象在 gc 清理前仍在 object store 里，可通过 reflog 找回。revert 比 reset 更安全，因为它创建新 commit，不改写历史。',
    notes_en: '--hard permanently discards working tree changes (uncommitted ones). Committed objects survive in the object store until gc; reflog can find them. revert is safer than reset: it creates a new commit and preserves history.',
    details_zh: [
      { term: 'git reflog expire', def: 'reflog 条目默认保留 90 天（unreachable 30 天），之后 gc 才会删除对象。' },
      { term: 'ORIG_HEAD', def: 'merge/rebase/reset 操作前 HEAD 的备份，方便快速撤销：git reset --hard ORIG_HEAD。' },
      { term: 'git revert', def: '安全的撤销：不改写历史，通过新 commit 抵消旧改动，适合公共分支。' },
      { term: 'git bisect', def: '二分查找引入 bug 的 commit：git bisect start → git bisect good/bad → 自动定位。' },
    ],
    details_en: [
      { term: 'git reflog expire', def: 'Reflog entries survive 90 days (unreachable: 30 days) before gc can remove the objects.' },
      { term: 'ORIG_HEAD', def: 'Backup of HEAD before merge/rebase/reset, for quick undo: git reset --hard ORIG_HEAD.' },
      { term: 'git revert', def: 'Safe undo: preserves history by adding a new inverse commit. Suitable for public branches.' },
      { term: 'git bisect', def: 'Binary search for the bad commit: git bisect start → mark good/bad → auto-locates.' },
    ],
  },
  {
    id: 'internals',
    icon: '⚙',
    color: '#888',
    label_zh: '.git 目录结构',
    label_en: '.git Directory',
    desc_zh: '.git/ 是 Git 仓库的全部数据。理解目录结构就能理解 Git 的工作原理。',
    desc_en: '.git/ is the entire git repository. Understanding this directory is understanding how git works.',
    diagram: `<svg viewBox="0 0 480 240" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:480px">
  <!-- directory tree -->
  <text x="20"  y="30"  fill="#f0883e" fontSize="12" fontWeight="700">.git/</text>
  <text x="40"  y="52"  fill="#3fb950" fontSize="11">HEAD</text>
  <text x="200" y="52"  fill="#666"    fontSize="10">→ ref: refs/heads/main</text>
  <text x="40"  y="72"  fill="#3fb950" fontSize="11">index</text>
  <text x="200" y="72"  fill="#666"    fontSize="10">staging area (binary)</text>
  <text x="40"  y="92"  fill="#3fb950" fontSize="11">config</text>
  <text x="200" y="92"  fill="#666"    fontSize="10">repo-local config (remote URL, etc.)</text>
  <text x="40"  y="112" fill="#58a6ff" fontSize="11">objects/</text>
  <text x="60"  y="130" fill="#ccc"    fontSize="10">info/    pack/    ab/cdef...    (loose)</text>
  <text x="200" y="112" fill="#666"    fontSize="10">all blobs, trees, commits, tags</text>
  <text x="40"  y="152" fill="#58a6ff" fontSize="11">refs/</text>
  <text x="60"  y="170" fill="#ccc"    fontSize="10">heads/main   tags/v1.0   remotes/origin/main</text>
  <text x="200" y="152" fill="#666"    fontSize="10">branch / tag / remote-tracking pointers</text>
  <text x="40"  y="192" fill="#d2a8ff" fontSize="11">logs/</text>
  <text x="200" y="192" fill="#666"    fontSize="10">HEAD reflog + per-branch reflog</text>
  <text x="40"  y="212" fill="#d2a8ff" fontSize="11">COMMIT_EDITMSG</text>
  <text x="200" y="212" fill="#666"    fontSize="10">last commit message (for --amend)</text>
  <!-- tree lines -->
  <line x1="30" y1="35" x2="30" y2="215" stroke="#333" strokeWidth="1"/>
  <line x1="30" y1="52"  x2="38" y2="52"  stroke="#333" strokeWidth="1"/>
  <line x1="30" y1="72"  x2="38" y2="72"  stroke="#333" strokeWidth="1"/>
  <line x1="30" y1="92"  x2="38" y2="92"  stroke="#333" strokeWidth="1"/>
  <line x1="30" y1="112" x2="38" y2="112" stroke="#333" strokeWidth="1"/>
  <line x1="30" y1="152" x2="38" y2="152" stroke="#333" strokeWidth="1"/>
  <line x1="30" y1="192" x2="38" y2="192" stroke="#333" strokeWidth="1"/>
  <line x1="30" y1="212" x2="38" y2="212" stroke="#333" strokeWidth="1"/>
</svg>`,
    code: `# Explore .git yourself
ls -la .git/
cat .git/HEAD                 # current branch ref
cat .git/refs/heads/main      # SHA of main branch tip

# Object storage
ls .git/objects/              # 2-char subdirs + pack/
git cat-file --batch-all-objects --batch-check   # list all objects

# Pack files (compressed object storage after git gc)
ls .git/objects/pack/         # *.pack + *.idx files
git verify-pack -v .git/objects/pack/*.idx  | head -20

# Hooks (run automatically on git events)
ls .git/hooks/                # pre-commit, post-merge, etc.

# Maintenance
git gc                        # pack loose objects, expire old reflogs
git fsck                      # verify object database integrity
git count-objects -vH         # size of object database`,
    codeTitle_zh: '.git 目录探索命令',
    codeTitle_en: '.git Directory Exploration',
    notes_zh: '删除 .git/ 就永久失去版本历史（但工作文件完好）。pack 文件是 zlib 压缩 + delta 编码的对象集合，比松散对象节省 80%+ 空间。hooks/ 下的可执行脚本在对应 git 事件时自动运行。',
    notes_en: 'Deleting .git/ permanently destroys version history (working files stay intact). Pack files use zlib compression + delta encoding — 80%+ space savings over loose objects. Scripts in hooks/ run automatically on corresponding git events.',
    details_zh: [
      { term: 'pack file', def: '多个对象打包成一个 *.pack 文件（加 *.idx 索引），使用 delta 压缩大幅减小体积。' },
      { term: 'hooks', def: '.git/hooks/ 下的脚本（pre-commit、pre-push、post-merge 等）可自动化校验和通知。' },
      { term: 'git fsck', def: '检查对象数据库完整性，找出悬空（dangling）对象和损坏的引用。' },
      { term: 'shallow clone', def: 'git clone --depth=1 只下载最近 N 个 commit，适合 CI 提速。完整历史可后续 fetch。' },
    ],
    details_en: [
      { term: 'pack file', def: 'Multiple objects packed into *.pack + *.idx with delta compression — huge space savings.' },
      { term: 'hooks', def: 'Scripts in .git/hooks/ (pre-commit, pre-push, post-merge, etc.) automate checks and notifications.' },
      { term: 'git fsck', def: 'Verifies object database integrity; finds dangling objects and broken refs.' },
      { term: 'shallow clone', def: 'git clone --depth=1 fetches only recent N commits — great for CI speed. Full history fetchable later.' },
    ],
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function GitView() {
  const { lang } = useLang()
  const isMobile = useMobile()
  const [selected, setSelected] = useState<string>(TOPICS[0].id)
  const [showMobileDetail, setShowMobileDetail] = useState(false)

  const topic = TOPICS.find(t => t.id === selected) ?? TOPICS[0]
  const isZh = lang === 'zh'

  const label   = (t: GitTopic) => isZh ? t.label_zh   : t.label_en
  const desc    = (t: GitTopic) => isZh ? t.desc_zh     : t.desc_en
  const notes   = (t: GitTopic) => isZh ? t.notes_zh    : t.notes_en
  const details = (t: GitTopic) => isZh ? t.details_zh  : t.details_en
  const codeTitle = (t: GitTopic) => isZh ? t.codeTitle_zh : t.codeTitle_en

  const selectTopic = (id: string) => {
    setSelected(id)
    if (isMobile) setShowMobileDetail(true)
  }

  const sidebar = (
    <div style={{
      width: isMobile ? '100%' : 200,
      flexShrink: 0,
      borderRight: isMobile ? 'none' : '1px solid var(--border)',
      overflowY: 'auto',
      display: isMobile && showMobileDetail ? 'none' : 'block',
    }}>
      <div style={{ padding: '12px 10px 6px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.6, textTransform: 'uppercase' }}>
        {isZh ? 'Git 内部原理' : 'Git Internals'}
      </div>
      {TOPICS.map(t => (
        <button
          key={t.id}
          onClick={() => selectTopic(t.id)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', border: 'none', textAlign: 'left', cursor: 'pointer',
            background: selected === t.id ? 'var(--surface)' : 'transparent',
            borderLeft: selected === t.id ? `3px solid ${t.color}` : '3px solid transparent',
            color: selected === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: 13, fontWeight: selected === t.id ? 600 : 400,
            transition: 'background 0.15s',
          }}
        >
          <span style={{ fontSize: 18, flexShrink: 0 }}>{t.icon}</span>
          <span>{label(t)}</span>
        </button>
      ))}
    </div>
  )

  const detail = (
    <div style={{
      flex: 1, overflowY: 'auto', padding: isMobile ? 16 : 24,
      display: isMobile && !showMobileDetail ? 'none' : 'block',
    }}>
      {isMobile && showMobileDetail && (
        <button
          onClick={() => setShowMobileDetail(false)}
          style={{ marginBottom: 16, fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          ← {isZh ? '返回列表' : 'Back'}
        </button>
      )}

      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 28 }}>{topic.icon}</span>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: topic.color }}>{label(topic)}</h2>
      </div>

      {/* Description */}
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
        {desc(topic)}
      </p>

      {/* SVG Diagram */}
      <div style={{
        background: 'var(--surface)', borderRadius: 10, padding: '16px 20px', marginBottom: 20,
        border: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {isZh ? '示意图' : 'Diagram'}
        </div>
        <div dangerouslySetInnerHTML={{ __html: topic.diagram }} />
      </div>

      {/* Details table */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {isZh ? '关键概念' : 'Key Concepts'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {details(topic).map((d, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, padding: '10px 14px',
              background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)',
            }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: topic.color, whiteSpace: 'nowrap', minWidth: 120 }}>
                {d.term}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{d.def}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Code block */}
      <div style={{ marginBottom: 20 }}>
        <CodeBlock code={topic.code} title={codeTitle(topic)} />
      </div>

      {/* Notes */}
      <div style={{
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.03)', borderRadius: 8,
        borderLeft: `3px solid ${topic.color}`,
        fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6,
      }}>
        <span style={{ fontWeight: 700, color: topic.color }}>
          {isZh ? '💡 说明' : '💡 Note'}
        </span>{' '}
        {notes(topic)}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
      {sidebar}
      {detail}
    </div>
  )
}
