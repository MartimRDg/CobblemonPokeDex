// ====================== Data Layer ======================
const State = {
  allPokemon: [],
  allMoves: {},
  currentMoveTab: 0,
  isShiny: false,
};

async function loadData() {
  try {
    const [pokeRes, movesRes] = await Promise.all([
      fetch('data/pokemon.json'),
      fetch('data/moves.json'),
    ]);

    if (!pokeRes.ok || !movesRes.ok) throw new Error('Failed to fetch data files');

    const [pokeData, movesData] = await Promise.all([pokeRes.json(), movesRes.json()]);

    State.allPokemon = pokeData.pokemon || [];
    State.allMoves = movesData.moves || {};

    console.log(`✅ Loaded ${State.allPokemon.length} Pokémon and ${Object.keys(State.allMoves).length} moves`);
    return true;
  } catch (err) {
    console.error('❌ Error loading data:', err);
    return false;
  }
}

function enrichMove(move) {
  if (!move?.name || !State.allMoves[move.name]) return move;
  return { ...State.allMoves[move.name], ...move };
}


// ====================== Index Page ======================
function buildFilters() {
  // Dynamically populate type and gen filters from data
  const types = [...new Set(State.allPokemon.flatMap(p => p.types || []))].sort();
  const gens = [...new Set(State.allPokemon.map(p => p.generation).filter(Boolean))].sort((a, b) => a - b);

  const typeSelect = document.getElementById('typeFilter');
  const genSelect = document.getElementById('genFilter');

  if (typeSelect) {
    types.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      typeSelect.appendChild(opt);
    });
  }

  if (genSelect) {
    gens.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = `Gen ${g}`;
      genSelect.appendChild(opt);
    });
  }
}

function renderGrid(pokemonList) {
  const grid = document.getElementById('pokemonGrid');
  if (!grid) return;

  if (pokemonList.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-20 text-gray-500">
        <div class="text-5xl mb-4">🔍</div>
        <p class="text-xl">No Pokémon found</p>
        <p class="text-sm mt-2">Try adjusting your filters</p>
      </div>`;
    return;
  }

  grid.innerHTML = pokemonList.map(poke => {
    const typeBadges = (poke.types || [])
      .map(t => `<span class="type-badge type-${t.toLowerCase()}">${t}</span>`)
      .join('');

    return `
      <div class="pokemon-card" role="button" tabindex="0"
           onclick="location.href='pokemon.html?id=${poke.id}'"
           onkeydown="if(event.key==='Enter') location.href='pokemon.html?id=${poke.id}'">
        <div class="card-inner">
          <img src="${poke.sprite || 'assets/images/placeholder.png'}"
               alt="${poke.name}"
               loading="lazy"
               onerror="this.src='assets/images/placeholder.png'"
               class="pokemon-sprite">
          <h3 class="pokemon-name">${poke.name}</h3>
          <p class="pokemon-number">#${poke.number || String(poke.id).padStart(4, '0')}</p>
          <div class="type-badges">${typeBadges}</div>
        </div>
      </div>`;
  }).join('');
}

function filterPokemon() {
  const search = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
  const typeFilter = document.getElementById('typeFilter')?.value || '';
  const genFilter = document.getElementById('genFilter')?.value || '';

  const filtered = State.allPokemon.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search) ||
                        String(p.id).includes(search) ||
                        (p.number || '').includes(search);
    const matchType = !typeFilter || (p.types || []).includes(typeFilter);
    const matchGen = !genFilter || String(p.generation) === genFilter;
    return matchSearch && matchType && matchGen;
  });

  renderGrid(filtered);
}


// ====================== Detail Page ======================
function getPokemonById(id) {
  return State.allPokemon.find(p => p.id === id) || null;
}

function buildStatBar(label, value, max = 255) {
  const pct = Math.min((value / max) * 100, 100).toFixed(1);
  const statLabels = {
    hp: 'HP', attack: 'Attack', defense: 'Defense',
    spAttack: 'Sp. Atk', spDefense: 'Sp. Def', speed: 'Speed',
  };
  const color = value >= 100 ? '#4ade80' : value >= 60 ? '#facc15' : '#f87171';
  return `
    <div class="stat-row">
      <span class="stat-label">${statLabels[label] || label}</span>
      <span class="stat-value" style="color:${color}">${value}</span>
      <div class="stat-bar-bg">
        <div class="stat-bar-fill" style="width:${pct}%;background:${color}"></div>
      </div>
    </div>`;
}

function buildTypeBadges(types, size = '') {
  return (types || [])
    .map(t => `<span class="type-badge type-${t.toLowerCase()} ${size}">${t}</span>`)
    .join('');
}

function buildDrops(drops) {
  if (!drops?.length) return '<p class="text-gray-500 text-sm">No drops data</p>';
  return drops.map(drop => `
    <div class="drop-row">
      <div class="drop-icon">
        ${drop.image
          ? `<img src="${drop.image}" alt="${drop.item}" onerror="this.parentElement.innerHTML='📦'">`
          : '📦'}
      </div>
      <div class="drop-info">
        <p class="drop-name">${drop.item}</p>
        <p class="drop-meta"><span class="text-green-400 font-semibold">${drop.chance}%</span> &nbsp;·&nbsp; Qty: ${drop.quantity}</p>
      </div>
    </div>`).join('');
}

function loadPokemonDetail() {
  const container = document.getElementById('pokemonDetail');
  if (!container) return;

  const id = parseInt(new URLSearchParams(window.location.search).get('id'));
  const poke = getPokemonById(id);

  if (!poke) {
    container.innerHTML = `
      <div class="error-state">
        <div class="text-5xl mb-4">❓</div>
        <p class="text-xl text-red-400">Pokémon not found</p>
        <a href="index.html" class="back-link mt-4 inline-block">← Back to Pokédex</a>
      </div>`;
    return;
  }

  // Update page title and meta
  document.title = `${poke.name} (#${poke.number || poke.id}) — Cobblemon Pokédex`;
  document.getElementById('pageTitle')?.remove();

  const statsHTML = poke.baseStats
    ? Object.entries(poke.baseStats).map(([k, v]) => buildStatBar(k, v)).join('')
    : '<p class="text-yellow-400 text-sm">No stats available</p>';

  const biomeHTML = (poke.spawnBiomes || []).map(b =>
    `<span class="biome-tag">${b}</span>`).join('') || '<span class="text-gray-500 text-sm">Unknown</span>';

  container.innerHTML = `
    <div class="detail-wrapper">

      <!-- Hero -->
      <div class="detail-hero">
        <div class="sprite-container">
          <img id="pokemonSprite"
               src="${poke.sprite}"
               alt="${poke.name}"
               onerror="this.src='assets/images/placeholder.png'"
               class="detail-sprite">
          ${poke.shinySprite ? `
          <button id="shinyBtn" onclick="toggleShiny()" class="shiny-btn" title="Toggle Shiny">
            ✨ <span id="shinyLabel">SHINY</span>
          </button>` : ''}
        </div>

        <div class="detail-info">
          <p class="detail-number">#${poke.number || String(poke.id).padStart(4, '0')}</p>
          <h1 class="detail-name">${poke.name}</h1>
          <div class="detail-types">${buildTypeBadges(poke.types, 'type-lg')}</div>

          <div class="detail-meta-grid">
            <div class="meta-card">
              <h3 class="meta-title">Abilities</h3>
              ${(poke.abilities || []).map(a => `<div class="meta-tag">${a}</div>`).join('')}
            </div>
            <div class="meta-card">
              <h3 class="meta-title">Rarity</h3>
              <div class="meta-tag">${poke.rarity || '—'}</div>
              <h3 class="meta-title mt-3">Generation</h3>
              <div class="meta-tag">Gen ${poke.generation || '?'}</div>
            </div>
            <div class="meta-card">
              <h3 class="meta-title">Dropped Items</h3>
              ${buildDrops(poke.drops)}
            </div>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <section class="detail-section">
        <h2 class="section-title">Base Stats</h2>
        <div class="stats-grid">${statsHTML}</div>
      </section>

      <!-- Type Effectiveness -->
      <section class="detail-section">
        <h2 class="section-title">Type Effectiveness</h2>
        <div class="effectiveness-grid">
          <div class="effectiveness-card weakness">
            <h3>Weaknesses</h3>
            <div class="badge-row">${buildTypeBadges(poke.weaknesses)}</div>
          </div>
          <div class="effectiveness-card resistance">
            <h3>Resistances</h3>
            <div class="badge-row">${buildTypeBadges(poke.resistances)}</div>
          </div>
          <div class="effectiveness-card immunity">
            <h3>Immunities</h3>
            <div class="badge-row">
              ${(poke.immunities || ['None']).map(i =>
                i === 'None'
                  ? `<span class="immunity-none">None</span>`
                  : buildTypeBadges([i])
              ).join('')}
            </div>
          </div>
        </div>
      </section>

      <!-- Spawn Info -->
      <section class="detail-section">
        <h2 class="section-title">Spawn Info</h2>
        <p class="section-subtitle">${(poke.spawnBiomes || []).length} biome(s) where ${poke.name} can appear</p>
        <div class="spawn-grid">
          <div class="meta-card">
            <h3 class="meta-title">Details</h3>
            <table class="spawn-table">
              <tr><td>Bucket</td><td>${poke.spawnBucket || '—'}</td></tr>
              <tr><td>Level</td><td>${poke.spawnLevel || '—'}</td></tr>
              <tr><td>Context</td><td>${poke.spawnContext || 'Natural'}</td></tr>
              <tr><td>Preset</td><td>${poke.spawnPreset || '—'}</td></tr>
              <tr><td>Raining</td><td>${poke.isRaining ? 'Yes' : 'No'}</td></tr>
            </table>
          </div>
          <div class="meta-card biome-card">
            <h3 class="meta-title">Biomes</h3>
            <div class="biome-tags">${biomeHTML}</div>
          </div>
        </div>
      </section>

      <!-- Moves -->
      <section class="detail-section">
        <h2 class="section-title">Moves</h2>
        <div class="move-tabs" role="tablist">
          ${['Level Up', 'TM', 'Egg', 'Tutor'].map((label, i) => `
            <button class="move-tab ${i === 0 ? 'active' : ''}"
                    role="tab"
                    aria-selected="${i === 0}"
                    onclick="switchMoveTab(${i})">${label}</button>`).join('')}
        </div>
        <div id="movesContent" class="moves-content"></div>
      </section>

    </div>`;

  // Attach shiny toggle data
  window._shinyData = { poke, isShiny: false };
  renderMoves(poke);
}

function renderMoves(poke) {
  const content = document.getElementById('movesContent');
  if (!content) return;

  const keys = ['level', 'tm', 'egg', 'tutor'];
  let moves = ((poke.moves || {})[keys[State.currentMoveTab]] || []).map(enrichMove);

  if (moves.length === 0) {
    content.innerHTML = `<p class="moves-empty">No moves in this category.</p>`;
    return;
  }

  // Sort non-level tabs by power descending
  if (State.currentMoveTab !== 0) {
    moves = [...moves].sort((a, b) => (parseInt(b.power) || 0) - (parseInt(a.power) || 0));
  }

  const isLevelTab = State.currentMoveTab === 0;

  content.innerHTML = `
    <div class="table-wrapper">
      <table class="moves-table">
        <thead>
          <tr>
            ${isLevelTab ? '<th>Lv.</th>' : ''}
            <th>Move</th>
            <th>Type</th>
            <th>Cat.</th>
            <th class="text-center">Pwr</th>
            <th class="text-center">Acc</th>
            <th class="text-center">PP</th>
          </tr>
        </thead>
        <tbody>
          ${moves.map(m => `
            <tr>
              ${isLevelTab ? `<td class="move-level">${m.level ?? '—'}</td>` : ''}
              <td class="move-name">${m.name}</td>
              <td>${m.type ? `<span class="type-badge type-${m.type.toLowerCase()} type-xs">${m.type}</span>` : '—'}</td>
              <td class="move-cat">${m.category || '—'}</td>
              <td class="text-center move-power">${m.power || '—'}</td>
              <td class="text-center">${m.accuracy || '—'}</td>
              <td class="text-center">${m.pp || '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

window.switchMoveTab = function (index) {
  State.currentMoveTab = index;

  document.querySelectorAll('.move-tab').forEach((btn, i) => {
    const active = i === index;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active);
  });

  const id = parseInt(new URLSearchParams(window.location.search).get('id'));
  const poke = getPokemonById(id);
  if (poke) renderMoves(poke);
};

window.toggleShiny = function () {
  const d = window._shinyData;
  if (!d?.poke?.shinySprite) return;

  d.isShiny = !d.isShiny;
  document.getElementById('pokemonSprite').src = d.isShiny ? d.poke.shinySprite : d.poke.sprite;

  const btn = document.getElementById('shinyBtn');
  const label = document.getElementById('shinyLabel');
  btn?.classList.toggle('active', d.isShiny);
  if (label) label.textContent = d.isShiny ? 'NORMAL' : 'SHINY';
};


// ====================== Init ======================
document.addEventListener('DOMContentLoaded', async () => {
  showLoadingState();

  const ok = await loadData();
  hideLoadingState();

  if (!ok) {
    showDataError();
    return;
  }

  // Index page
  const grid = document.getElementById('pokemonGrid');
  if (grid) {
    buildFilters();
    renderGrid(State.allPokemon);

    document.getElementById('searchInput')?.addEventListener('input', filterPokemon);
    document.getElementById('typeFilter')?.addEventListener('change', filterPokemon);
    document.getElementById('genFilter')?.addEventListener('change', filterPokemon);
  }

  // Detail page
  if (document.getElementById('pokemonDetail')) {
    loadPokemonDetail();
  }
});

function showLoadingState() {
  const grid = document.getElementById('pokemonGrid');
  const detail = document.getElementById('pokemonDetail');
  if (grid) {
    grid.innerHTML = Array(12).fill(0).map(() => `<div class="pokemon-card skeleton"></div>`).join('');
  }
  if (detail) {
    detail.innerHTML = `<div class="detail-loading"><div class="spinner"></div><p>Loading Pokémon data…</p></div>`;
  }
}

function hideLoadingState() {
  // Cleared by render functions
}

function showDataError() {
  const grid = document.getElementById('pokemonGrid');
  const detail = document.getElementById('pokemonDetail');
  const msg = `
    <div class="error-state col-span-full">
      <div class="text-4xl mb-3">⚠️</div>
      <p class="text-red-400 text-lg">Failed to load Pokémon data</p>
      <p class="text-gray-500 text-sm mt-1">Check that <code>data/pokemon.json</code> and <code>data/moves.json</code> exist.</p>
    </div>`;
  if (grid) grid.innerHTML = msg;
  if (detail) detail.innerHTML = msg;
}