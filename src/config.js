// Debug tools are opt-in; normal play exposes neither cheats nor mutable test hooks.
export const DEBUG = new URLSearchParams(location.search).get('debug') === '1';
