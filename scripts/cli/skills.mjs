// `slide-ng skills install [--dir <folder>] [--force]`: copies the agent skill of this package into a project.
// The skill lands in `<dir>/slide-ng`; `--dir` defaults to `.agents/skills`. The project is the current folder:
// nothing is ever written outside it, and an existing copy is only replaced with --force.
import { didYouMean } from '../lib/did-you-mean.mjs';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
} from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { parseFlags } from './flags.mjs';
import { packageRoot as ownRoot } from './package-root.mjs';

export const SKILL_NAME = 'slide-ng';
export const DEFAULT_SKILLS_DIR = '.agents/skills';

/** The real path of the closest folder above `path` that exists (symbolic links resolved). */
function nearestRealAncestor(path) {
  let current = path;
  while (!existsSync(current)) current = dirname(current);
  return realpathSync(current);
}

/** Throws unless `target` is a folder strictly inside `project`, also after symbolic links are followed. */
export function checkInsideProject(project, target) {
  const root = realpathSync(project);
  const wanted = resolve(project, target);
  const inside = (p) => p.startsWith(root + sep);
  if (
    !wanted.startsWith(resolve(project) + sep) ||
    !inside(join(nearestRealAncestor(wanted), sep))
  ) {
    throw new Error(
      `Refusing to write ${wanted}: it is outside the project (${resolve(project)}).`,
    );
  }
  return wanted;
}

/** True when the folder holds this skill (its SKILL.md names it), so --force may replace it. */
function isOurSkill(dir) {
  const file = join(dir, 'SKILL.md');
  return (
    existsSync(file) &&
    new RegExp(`^name:\\s*${SKILL_NAME}\\s*$`, 'm').test(readFileSync(file, 'utf8'))
  );
}

// `packageRoot` and `project` are only given by tests.
export async function skillsCommand(argv, { packageRoot = ownRoot, project = process.cwd() } = {}) {
  const [action, ...rest] = argv;
  if (action !== 'install')
    throw new Error(
      `${action === undefined ? '' : `Unknown skills command "${action}".${didYouMean(action, ['install'])} `}Usage: slide-ng skills install [--dir <folder>] [--force]`,
    );
  const { flags, positionals } = parseFlags(rest, {
    dir: { type: 'string' },
    force: { type: 'boolean', alias: 'f' },
  });
  if (positionals.length) throw new Error(`Unexpected argument "${positionals[0]}"`);

  const source = join(packageRoot, 'skills', SKILL_NAME);
  if (!existsSync(join(source, 'SKILL.md'))) throw new Error(`The skill is missing from ${source}`);
  const target = checkInsideProject(project, join(flags.dir ?? DEFAULT_SKILLS_DIR, SKILL_NAME));

  if (existsSync(target) || isLink(target)) {
    if (isLink(target)) throw new Error(`Refusing to replace ${target}: it is a symbolic link.`);
    if (!flags.force)
      throw new Error(`${target} already exists. Pass --force to replace it with this version.`);
    if (!isOurSkill(target))
      throw new Error(`Refusing to replace ${target}: it is not the ${SKILL_NAME} skill.`);
    rmSync(target, { recursive: true });
  }
  mkdirSync(dirname(target), { recursive: true });
  checkInsideProject(project, target); // again, now that the parents exist
  cpSync(source, target, { recursive: true, dereference: false });
  console.log(`Installed the ${SKILL_NAME} skill in ${target}`);
  return target;
}

const isLink = (path) => {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
};
