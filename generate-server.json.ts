import { writeFile } from 'fs/promises';

const version = process.argv[2]?.trim().replace(/^v/, '');
if (!version) {
  console.error('Must provide version as first argument');
  process.exit(1);
}

const environmentVariables = [
  {
    description: 'Token to access (private) GitHub repos',
    isRequired: false,
    format: 'string',
    isSecret: true,
    name: 'GITHUB_TOKEN',
  },
  {
    description: 'Location of configuration file for skills',
    isRequired: false,
    format: 'string',
    isSecret: false,
    name: 'SKILLS_FILE',
  },
];

const output = {
  $schema:
    'https://static.modelcontextprotocol.io/schemas/2025-10-17/server.schema.json',
  name: 'io.github.timescale/tiger-skills',
  // max length 100 chars:
  description:
    'Provider agnostic skills implementation, with skills sourced from local paths or GitHub repositories',
  repository: {
    url: 'https://github.com/timescale/tiger-skills-mcp-server',
    source: 'github',
  },
  version,
  packages: [
    {
      registryType: 'npm',
      identifier: '@tigerdata/tiger-skills-mcp-server',
      version,
      transport: {
        type: 'stdio',
      },
      environmentVariables,
    },
    {
      registryType: 'oci',
      identifier: `ghcr.io/timescale/tiger-skills-mcp-server:${version}`,
      transport: {
        type: 'streamable-http',
      },
      environmentVariables,
    },
  ],
};

await writeFile('server.json', JSON.stringify(output, null, 2));
