import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'schema.prisma',
  datasource: {
    url: 'postgresql://handball_user:handball123@localhost:5432/handball?schema=public',
  },
})