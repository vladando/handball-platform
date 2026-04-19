import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'schema.prisma',
  datasource: {
    url: 'postgresql://handballuser:NekaSigurnaLozinka123!@localhost:5432/handballdb',
  },
})

