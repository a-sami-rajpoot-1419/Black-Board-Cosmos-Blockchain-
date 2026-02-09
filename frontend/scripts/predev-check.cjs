const major = Number(process.versions.node.split('.')[0]);

// Vite 5 is stable on Node 18/20/22. Newer majors can work but have been
// observed to cause dev-server flakiness (HMR disconnects / exit code 1) on
// some Windows setups.
if (Number.isFinite(major) && major >= 23) {
  // eslint-disable-next-line no-console
  console.warn(
    `\n[predev] You are running Node ${process.versions.node}.\n` +
      '[predev] If the Vite dev server keeps dropping (ERR_CONNECTION_REFUSED / server connection lost),\n' +
      '[predev] switch to Node 20 LTS (recommended) or Node 22.\n' +
      '[predev] This does not affect `npm run build`, only dev stability.\n'
  );
}
