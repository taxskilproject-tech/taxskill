FROM mcr.microsoft.com/playwright:v1.64.1-noble AS compiler

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive
COPY scripts ./scripts
COPY src ./src
RUN yarn h10:worker:build
RUN mkdir /runtime-dependencies && node -e "const fs = require('fs'); const source = require('./package.json'); const names = ['@supabase/supabase-js', 'pdf-lib', 'playwright-core', 'zod']; const dependencies = Object.fromEntries(names.map(name => [name, source.dependencies[name]])); fs.writeFileSync('/runtime-dependencies/package.json', JSON.stringify({name: 'taxskill-sunat-runtime', private: true, dependencies}));"
RUN cp yarn.lock /runtime-dependencies/yarn.lock && yarn --cwd /runtime-dependencies install --frozen-lockfile --production=true --non-interactive

FROM mcr.microsoft.com/playwright:v1.64.1-noble AS runtime

WORKDIR /app
COPY --from=compiler /runtime-dependencies/node_modules ./node_modules
RUN apt-get update && apt-get install -y --no-install-recommends sudo && rm -rf /var/lib/apt/lists/*
RUN install -d -o pwuser -g pwuser /private/results
COPY --from=compiler /app/.sunat-worker-build ./build
USER pwuser

CMD ["xvfb-run", "-a", "node", "/app/build/scripts/sunat-worker/worker.js", "--once"]
