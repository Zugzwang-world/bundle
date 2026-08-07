import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import { BundleProvider } from '../src/state/store';

for (const path of ['/', '/prototype']) {
  const html = renderToString(
    <MemoryRouter initialEntries={[path]}>
      <BundleProvider>
        <App />
      </BundleProvider>
    </MemoryRouter>,
  );
  const checks = path === '/'
    ? ['Bundle', 'Meera', 'Retirement planning', 'zugzwangworld', 'rename, edit, or hide']
    : ['Chats and tasks', 'Bundle chats', 'bookclub/notes', 'Recents', 'Demo controls', 'seven journeys', 'Filter by All'];
  for (const c of checks) {
    if (!html.includes(c)) throw new Error(`[${path}] missing: ${c}`);
  }
  console.log(`${path} OK — ${html.length} bytes`);
}
console.log('smoke passed');
