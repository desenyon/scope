import type { FrameworkInfo } from "../types.ts";
import type { ManifestBundle } from "../core/manifests.ts";
import { manifestExists } from "../core/manifests.ts";

interface FrameworkRule {
  name: string;
  category: string;
  deps?: string[];
  files?: string[];
  confidence: FrameworkInfo["confidence"];
}

const FRAMEWORK_RULES: FrameworkRule[] = [
  { name: "Next.js", category: "Web Framework", deps: ["next"], confidence: "high" },
  { name: "Nuxt", category: "Web Framework", deps: ["nuxt"], confidence: "high" },
  { name: "Remix", category: "Web Framework", deps: ["@remix-run/react", "@remix-run/node"], confidence: "high" },
  { name: "Astro", category: "Web Framework", deps: ["astro"], confidence: "high" },
  { name: "SvelteKit", category: "Web Framework", deps: ["@sveltejs/kit"], confidence: "high" },
  { name: "Gatsby", category: "Web Framework", deps: ["gatsby"], confidence: "high" },
  { name: "Angular", category: "Web Framework", deps: ["@angular/core"], confidence: "high" },
  { name: "Vue", category: "UI Library", deps: ["vue"], confidence: "high" },
  { name: "React", category: "UI Library", deps: ["react"], confidence: "high" },
  { name: "Svelte", category: "UI Library", deps: ["svelte"], confidence: "high" },
  { name: "SolidJS", category: "UI Library", deps: ["solid-js"], confidence: "high" },
  { name: "Qwik", category: "Web Framework", deps: ["@builder.io/qwik"], confidence: "high" },
  { name: "Express", category: "Backend", deps: ["express"], confidence: "high" },
  { name: "Fastify", category: "Backend", deps: ["fastify"], confidence: "high" },
  { name: "NestJS", category: "Backend", deps: ["@nestjs/core"], confidence: "high" },
  { name: "Hono", category: "Backend", deps: ["hono"], confidence: "high" },
  { name: "Koa", category: "Backend", deps: ["koa"], confidence: "high" },
  { name: "tRPC", category: "API", deps: ["@trpc/server"], confidence: "high" },
  { name: "GraphQL", category: "API", deps: ["graphql", "@apollo/server", "apollo-server"], confidence: "medium" },
  { name: "React Native", category: "Mobile", deps: ["react-native"], confidence: "high" },
  { name: "Expo", category: "Mobile", deps: ["expo"], confidence: "high" },
  { name: "Flutter", category: "Mobile", files: ["pubspec.yaml"], confidence: "high" },
  { name: "Ionic", category: "Mobile", deps: ["@ionic/angular", "@ionic/react"], confidence: "high" },
  { name: "Electron", category: "Desktop", deps: ["electron"], confidence: "high" },
  { name: "Tauri", category: "Desktop", deps: ["@tauri-apps/api"], confidence: "high" },
  { name: "Django", category: "Backend", deps: ["django"], confidence: "high" },
  { name: "Flask", category: "Backend", deps: ["flask"], confidence: "high" },
  { name: "FastAPI", category: "Backend", deps: ["fastapi"], confidence: "high" },
  { name: "Streamlit", category: "Data App", deps: ["streamlit"], confidence: "high" },
  { name: "Rails", category: "Backend", files: ["config/application.rb"], confidence: "high" },
  { name: "Sinatra", category: "Backend", deps: ["sinatra"], confidence: "high" },
  { name: "Gin", category: "Backend", deps: ["github.com/gin-gonic/gin"], confidence: "high" },
  { name: "Fiber", category: "Backend", deps: ["github.com/gofiber/fiber"], confidence: "high" },
  { name: "Echo", category: "Backend", deps: ["github.com/labstack/echo"], confidence: "high" },
  { name: "Actix Web", category: "Backend", deps: ["actix-web"], confidence: "high" },
  { name: "Axum", category: "Backend", deps: ["axum"], confidence: "high" },
  { name: "Rocket", category: "Backend", deps: ["rocket"], confidence: "high" },
  { name: "Spring Boot", category: "Backend", files: ["pom.xml", "build.gradle"], confidence: "medium" },
  { name: "Tailwind CSS", category: "Styling", deps: ["tailwindcss"], confidence: "high" },
  { name: "Bootstrap", category: "Styling", deps: ["bootstrap"], confidence: "high" },
  { name: "styled-components", category: "Styling", deps: ["styled-components"], confidence: "high" },
  { name: "Redux", category: "State", deps: ["redux", "@reduxjs/toolkit"], confidence: "high" },
  { name: "Zustand", category: "State", deps: ["zustand"], confidence: "high" },
  { name: "Jotai", category: "State", deps: ["jotai"], confidence: "high" },
  { name: "MobX", category: "State", deps: ["mobx"], confidence: "high" },
  { name: "Prisma", category: "ORM", deps: ["@prisma/client", "prisma"], confidence: "high" },
  { name: "Drizzle ORM", category: "ORM", deps: ["drizzle-orm"], confidence: "high" },
  { name: "TypeORM", category: "ORM", deps: ["typeorm"], confidence: "high" },
  { name: "Sequelize", category: "ORM", deps: ["sequelize"], confidence: "high" },
  { name: "SQLAlchemy", category: "ORM", deps: ["sqlalchemy"], confidence: "high" },
  { name: "NextAuth.js", category: "Auth", deps: ["next-auth", "@auth/core"], confidence: "high" },
  { name: "Clerk", category: "Auth", deps: ["@clerk/nextjs", "@clerk/clerk-react"], confidence: "high" },
  { name: "Auth0", category: "Auth", deps: ["@auth0/nextjs-auth0"], confidence: "high" },
  { name: "Supabase", category: "BaaS", deps: ["@supabase/supabase-js"], confidence: "high" },
  { name: "Firebase", category: "BaaS", deps: ["firebase", "firebase-admin"], confidence: "high" },
  { name: "OpenAI SDK", category: "AI", deps: ["openai"], confidence: "high" },
  { name: "LangChain", category: "AI", deps: ["langchain", "@langchain/core"], confidence: "high" },
  { name: "Vercel AI SDK", category: "AI", deps: ["ai", "@ai-sdk/openai"], confidence: "high" },
  { name: "PyTorch", category: "ML", deps: ["torch"], confidence: "high" },
  { name: "TensorFlow", category: "ML", deps: ["tensorflow"], confidence: "high" },
  { name: "Hugging Face", category: "ML", deps: ["transformers", "huggingface_hub"], confidence: "high" },
  { name: "Vite", category: "Build", deps: ["vite"], confidence: "high" },
  { name: "Webpack", category: "Build", deps: ["webpack"], confidence: "high" },
  { name: "esbuild", category: "Build", deps: ["esbuild"], confidence: "high" },
  { name: "Rollup", category: "Build", deps: ["rollup"], confidence: "high" },
  { name: "Parcel", category: "Build", deps: ["parcel"], confidence: "high" },
];

export function scanFrameworks(manifests: ManifestBundle, depNames: Set<string>): FrameworkInfo[] {
  const frameworks: FrameworkInfo[] = [];
  const pkg = manifests.packageJson as Record<string, Record<string, string>> | null;
  const combinedDeps = {
    ...pkg?.dependencies,
    ...pkg?.devDependencies,
    ...pkg?.peerDependencies,
  };

  for (const rule of FRAMEWORK_RULES) {
    let matched = false;
    let version: string | undefined;

    if (rule.deps) {
      for (const dep of rule.deps) {
        if (depNames.has(dep) || combinedDeps?.[dep]) {
          matched = true;
          version = combinedDeps?.[dep]?.replace(/^[\^~>=<]*/, "");
          break;
        }
      }
    }

    if (!matched && rule.files) {
      for (const file of rule.files) {
        if (manifestExists(manifests, file)) {
          matched = true;
          break;
        }
      }
    }

    if (matched) {
      frameworks.push({ name: rule.name, version, category: rule.category, confidence: rule.confidence });
    }
  }

  return frameworks;
}
