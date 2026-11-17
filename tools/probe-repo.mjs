/** 匿名探测 GitHub 仓库可见性与 Pages 状态。用法：node tools/probe-repo.mjs */
const res = await fetch('https://api.github.com/repos/Nianxier/perler-beads', {
  signal: AbortSignal.timeout(30000),
});
console.log('repo api:', res.status);
if (res.ok) {
  const j = await res.json();
  console.log('private:', j.private, '| has_pages:', j.has_pages, '| branch:', j.default_branch);
} else {
  console.log('(404 = 仓库仍是私有或不存在)');
}
