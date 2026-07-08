# Git Checkout Command

## Overview

The `vh git checkout` command allows users to switch to an existing Git branch or create a new branch through an interactive terminal interface.

Unlike the native Git command, VH Helper provides a searchable branch picker that makes branch discovery easy and reduces typing mistakes.

The first option in the branch selector is always **Create New Branch**, allowing users to quickly create and switch to a new branch.

---

# Command Syntax

```bash
vh git checkout [branch]
```

```bash
vh git checkout -b <branch>
```

---

# Supported Modes

| Command                            | Description                            |
| ---------------------------------- | -------------------------------------- |
| `vh git checkout`                  | Opens the interactive branch selector. |
| `vh git checkout main`             | Checks out an existing branch.         |
| `vh git checkout -b feature/login` | Creates and checks out a new branch.   |

---

# Workflow

```mermaid
flowchart TD

A[User executes checkout command] --> B[Validate Git repository]


B -->|Yes| G{Branch argument provided?}

G -->|Yes| H{Create New Branch}

H -->|Yes| Crc[Create Branch]

H -->|No| Co[Checkout]

Crc --> Co



G -->|No| C{Is working tree clean}

C -->|Yes| I[Load all branches]

C-->|No| D[Abort Checkout]

I --> J[Create option for selection]

J --> L[Insert 'Create New Branch' option]

L --> M[Display searchable branch picker]

M --> N{User selection}

N --> |Existing Branch| O{selected remote branch}

O--> |Yes| Chl{corresponding local branch exist}
O--> |No| Lco[checkout local branch]

Chl--> |Yes| Lco

Chl -->|No| Cl[Create corresponding Local branch]

Cl--> Lco

N -->|Create New Branch| P[Prompt for branch name]

P --> Q[Validate branch name]

Q --> R[Create & checkout new branch]

Co --> S[Done]

Lco --> S

R --> S
```

---

# Interactive Mode

Running

```bash
vh git checkout
```

opens an interactive searchable list.

```text
Search branch...

❯ ➕ Create New Branch

  main
  develop
  feature/expo
  release/v1
```

The user can type to instantly filter the list.

Example:

```text
Search branch...

> fe
```

Result

```text
❯ feature/expo
  feature/login
```

---

# Branch Ordering

Branches are displayed in the following order.

1. Create New Branch
2. Current Branch
3. Local Branches
4. Remote Branches

Example

```text
➕ Create New Branch

────────────────────

✓ new-vh

main

develop

────────────────────

origin/main

origin/develop

origin/feature/expo
```

---

# Working Tree Validation

Before switching branches, VH Helper validates that the current working tree is clean.

This prevents accidental loss of uncommitted work and follows Git's recommended workflow.

```mermaid
flowchart LR

A[Read Git Status]
--> B{Uncommitted changes?}

B -->|Yes| C[Abort checkout]

B -->|No| D[Continue checkout]
```

If changes are detected, checkout is aborted.

Example:

```text
Cannot switch branches.

The following files contain uncommitted changes:

• src/features/git/git.controller.ts
• package.json

Please commit, stash, or discard your changes before switching branches.
```

---

# Creating a Branch

When **Create New Branch** is selected, VH Helper prompts for a branch name.

```text
Branch Name

❯ feature/payment
```

VH Helper executes

```bash
git checkout -b feature/payment
```

---

# Direct Checkout

Checkout an existing branch.

```bash
vh git checkout develop
```

Equivalent Git command:

```bash
git checkout develop
```

---

# Create Branch

Create and switch to a new branch.

```bash
vh git checkout -b feature/login
```

Equivalent Git command:

```bash
git checkout -b feature/login
```

---

# Internal Checkout Flow

```mermaid
sequenceDiagram

participant User
participant VH Helper
participant Git

User->>VH Helper: vh git checkout [branch]

VH Helper->>Git: Validate Git repository
Git-->>VH Helper: Repository valid

alt Branch argument provided

    alt Create New Branch
        VH Helper->>Git: git branch <name>
        Git-->>VH Helper: Branch created
    end

    VH Helper->>Git: git checkout <branch>
    Git-->>VH Helper: Checkout successful
    VH Helper-->>User: Switched to branch

else No branch argument

    VH Helper->>Git: Read git status
    Git-->>VH Helper: Working tree status

    alt Working tree not clean
        VH Helper-->>User: Abort checkout
    else Working tree clean

        VH Helper->>Git: Load local branches
        VH Helper->>Git: Load remote branches
        Git-->>VH Helper: Branch list

        VH Helper-->>User: Display searchable branch picker
        User->>VH Helper: Select option

        alt Existing Branch

            alt Selected branch is remote
                VH Helper->>Git: Check corresponding local branch
                Git-->>VH Helper: Local branch exists?

                alt Local branch does not exist
                    VH Helper->>Git: Create local tracking branch
                    Git-->>VH Helper: Branch created
                end
            end

            VH Helper->>Git: git checkout <branch>
            Git-->>VH Helper: Checkout successful
            VH Helper-->>User: Switched to branch

        else Create New Branch

            VH Helper-->>User: Prompt for branch name
            User->>VH Helper: Enter branch name

            VH Helper->>Git: Validate branch name
            Git-->>VH Helper: Branch name valid

            VH Helper->>Git: git checkout -b <branch>
            Git-->>VH Helper: Branch created & checked out
            VH Helper-->>User: Switched to new branch

        end
    end
end
```

---

# Create Branch Flow

```mermaid
sequenceDiagram

participant User
participant VH Helper
participant Git

User->>VH Helper: Select "Create New Branch"

VH Helper-->>User: Prompt for branch name

User->>VH Helper: feature/payment

VH Helper->>Git: git checkout -b feature/payment

Git-->>VH Helper: Branch created

VH Helper-->>User: Switched to feature/payment
```

---

# Features

- Interactive branch picker
- Live branch search and filtering
- Direct checkout by branch name
- Create and checkout new branch
- Working tree validation before checkout
- Supports local branches
- Supports remote branches
- Current branch highlighting
- Git-compatible command syntax
- Fast interactive workflow
