b86f316 test: improve coverage reliability and add missing edge cases (#44)
e1a266f Fix test coverage for single-line if statements (#43)
96178f5 test: fix failing telegram service test cases (#42)
8d29abe style: standardize telegram notification layouts with premium look
c0f406f chore: update pnpm-lock.yaml to sync with package.json
2c21cf1 style(test): convert single-line ifs to block braces (#39)
7b83363 chore: verify 100% test coverage (#38)
8338e77 test: fix branch coverage false negatives for single line ifs\n\n- Replaced single-line if statements without curly braces with block statements to ensure accurate v8 coverage reporting.\n- Added `all: true` to vitest config coverage options. (#36)
f415957 test: verify 100% test coverage (#35)
97b5c57 test: Ensure 100% test coverage (#34)