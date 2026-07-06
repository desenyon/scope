import type { ScriptsInfo, DatabaseInfo, RoutesInfo, ArchitectureInfo, HealthInfo, CodebaseInfo } from "./scanners/extras.ts";

export type { ScriptsInfo, DatabaseInfo, RoutesInfo, ArchitectureInfo, HealthInfo, CodebaseInfo };

export interface LanguageStats {
  language: string;
  files: number;
  lines: number;
  code: number;
  comments: number;
  blanks: number;
}

export interface DependencyInfo {
  name: string;
  version: string;
  type: "production" | "development" | "peer" | "optional";
  ecosystem: string;
}

export interface FrameworkInfo {
  name: string;
  version?: string;
  category: string;
  confidence: "high" | "medium" | "low";
}

export interface RuntimeInfo {
  name: string;
  version?: string;
  source: string;
}

export interface GitInfo {
  isRepo: boolean;
  branch?: string;
  remote?: string;
  commitCount?: number;
  lastCommit?: string;
  lastCommitDate?: string;
  firstCommitDate?: string;
  repoAgeDays?: number;
  contributors?: number;
  dirty?: boolean;
}

export interface DevOpsInfo {
  docker: boolean;
  dockerCompose: boolean;
  ci: string[];
  kubernetes: boolean;
  terraform: boolean;
  makefile: boolean;
  githubActions: number;
}

export interface TestingInfo {
  frameworks: string[];
  testFiles: number;
  coverageConfig: boolean;
}

export interface QualityInfo {
  linters: string[];
  formatters: string[];
  typescript: boolean;
  typescriptStrict?: boolean;
}

export interface SecurityInfo {
  envFiles: string[];
  hasLockfile: boolean;
  lockfiles: string[];
  secretsPatterns: number;
}

export interface DocumentationInfo {
  hasReadme: boolean;
  readmeLines?: number;
  hasDocsFolder: boolean;
  docFiles: number;
}

export interface MonorepoInfo {
  isMonorepo: boolean;
  tool?: string;
  packages: number;
}

export interface StructureInfo {
  totalFiles: number;
  totalDirectories: number;
  extensions: Record<string, number>;
  largestFiles: { path: string; lines: number; size: number }[];
  depth: number;
}

export interface ProjectIdentity {
  name?: string;
  description?: string;
  version?: string;
  license?: string;
  authors: string[];
  repository?: string;
}

export interface ScopeReport {
  path: string;
  analyzedAt: string;
  durationMs: number;
  identity: ProjectIdentity;
  languages: LanguageStats[];
  totalLines: number;
  totalCode: number;
  totalFiles: number;
  frameworks: FrameworkInfo[];
  runtimes: RuntimeInfo[];
  dependencies: DependencyInfo[];
  dependencyCount: number;
  git: GitInfo;
  devops: DevOpsInfo;
  testing: TestingInfo;
  quality: QualityInfo;
  security: SecurityInfo;
  documentation: DocumentationInfo;
  monorepo: MonorepoInfo;
  structure: StructureInfo;
  packageManagers: string[];
  locEngine: "tokei" | "native";
  listEngine: "fd" | "rg" | "native";
  tools: { tokei: boolean; fd: boolean; rg: boolean };
  scripts: ScriptsInfo;
  database: DatabaseInfo;
  routes: RoutesInfo;
  architecture: ArchitectureInfo;
  health: HealthInfo;
  codebase: CodebaseInfo;
}

export interface AnalyzeOptions {
  path: string;
  verbose?: boolean;
}
