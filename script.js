// ====================== Data Layer ======================
const State = {
  allPokemon: [],
  allMoves: {},
  allAbilities: {},
  allGames: [],
  currentMoveTab: 0,
  isShiny: false,
  currentPage: 1,
  pageSize: 18,
};

async function loadData() {
  try {
    const [pokeRes, movesRes, abilitiesRes, gamesRes] = await Promise.all([
      fetch('data/pokemon.json'),
      fetch('data/moves.json'),
      fetch('data/abilities.json'),
      fetch('data/games.json'),
    ]);

    if (!pokeRes.ok || !movesRes.ok) throw new Error('Failed to fetch data files');

    const [pokeData, movesData, abilitiesData, gamesData] = await Promise.all([
      pokeRes.json(), movesRes.json(),
      abilitiesRes.ok ? abilitiesRes.json() : Promise.resolve({ abilities: {} }),
      gamesRes.ok ? gamesRes.json() : Promise.resolve({ games: [] }),
    ]);

    State.allPokemon = pokeData.pokemon || [];
    State.allMoves = movesData.moves || {};
    State.allAbilities = abilitiesData.abilities || {};
    State.allGames = gamesData.games || [];
    window._allMoves = State.allMoves;

    console.log('Loaded ' + State.allPokemon.length + ' Pokemon, ' + Object.keys(State.allMoves).length + ' moves, ' + State.allGames.length + ' game rows');
    return true;
  } catch (err) {
    console.error('Error loading data:', err);
    return false;
  }
}

function enrichMove(move) {
  if (!move || !move.name || !State.allMoves[move.name]) return move;
  return Object.assign({}, State.allMoves[move.name], move);
}

// Returns either a <video> or <img> tag depending on whether a video exists
function buildSpriteEl(src, alt, cssClass, fallback) {
  fallback = fallback || 'assets/images/placeholder.png';
  if (!src) return '<img src="' + fallback + '" alt="' + alt + '" class="' + cssClass + '">';
  var ext = src.split('.').pop().toLowerCase();
  if (ext === 'mov' || ext === 'mp4' || ext === 'webm') {
    return (
      '<video class="' + cssClass + '" autoplay loop muted playsinline disablepictureinpicture preload="auto" style="display:block">' +
      '<source src="' + src + '" type="video/' + (ext === 'mov' ? 'mp4' : ext) + '">' +
      '</video>'
    );
  }
  return '<img src="' + src + '" alt="' + alt + '" class="' + cssClass + '" onerror="this.src=\'' + fallback + '\'">';
}

function playAllVideos() {
  document.querySelectorAll('video').forEach(function (v) {
    v.muted = true;
    v.play().catch(function () { });
  });
}



// Type border colours
var TYPE_COLORS = {
  grass: '#4a9e3f', poison: '#8b44b0', fire: '#d43a1a', water: '#2a6fc4',
  electric: '#c0960a', normal: '#6b7280', flying: '#5469c4', bug: '#5d8a1a',
  dragon: '#4a28c0', rock: '#8a6a22', dark: '#3a3230', fighting: '#b02020',
  ground: '#9a6418', steel: '#4a6070', psychic: '#b82872', ghost: '#4a2a78',
  ice: '#2a8fa0', fairy: '#b84888',
};


// Type border colours
var TYPE_COLORS = {
  grass: '#4a9e3f', poison: '#8b44b0', fire: '#d43a1a', water: '#2a6fc4',
  electric: '#c0960a', normal: '#6b7280', flying: '#5469c4', bug: '#5d8a1a',
  dragon: '#4a28c0', rock: '#8a6a22', dark: '#3a3230', fighting: '#b02020',
  ground: '#9a6418', steel: '#4a6070', psychic: '#b82872', ghost: '#4a2a78',
  ice: '#2a8fa0', fairy: '#b84888',
};

// ====================== Index Page ======================
function buildFilters() {
  const types = [...new Set(State.allPokemon.flatMap(function (p) { return p.types || []; }))].sort();
  const gens = [...new Set(State.allPokemon.map(function (p) { return p.generation; }).filter(Boolean))].sort(function (a, b) { return a - b; });

  const typeSelect = document.getElementById('typeFilter');
  const genSelect = document.getElementById('genFilter');

  if (typeSelect) {
    types.forEach(function (t) {
      var opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      typeSelect.appendChild(opt);
    });
  }

  if (genSelect) {
    gens.forEach(function (g) {
      var opt = document.createElement('option');
      opt.value = g;
      opt.textContent = 'Gen ' + g;
      genSelect.appendChild(opt);
    });
  }
}

// Stores the current filtered list for pagination
var _filteredList = [];

function renderGrid(pokemonList, resetPage) {
  const grid = document.getElementById('pokemonGrid');
  if (!grid) return;

  _filteredList = pokemonList;
  if (resetPage) State.currentPage = 1;

  if (pokemonList.length === 0) {
    grid.innerHTML =
      '<div class="col-span-full text-center py-20 text-gray-500">' +
      '<div class="text-5xl mb-4">&#128269;</div>' +
      '<p class="text-xl">No Pokémon found</p>' +
      '<p class="text-sm mt-2">Try adjusting your filters</p>' +
      '</div>';
    renderPagination(0);
    return;
  }

  var start = (State.currentPage - 1) * State.pageSize;
  var end = start + State.pageSize;
  var page = pokemonList.slice(start, end);

  grid.innerHTML = page.map(function (poke) {
    var typeBadges = (poke.types || [])
      .map(function (t) {
        var tl = t.toLowerCase();
        return '<span class="type-badge type-' + tl + '"><img src="assets/images/elements/' + tl + '.png" class="type-icon" alt="" onerror="this.style.display=\'none\'">' + t + '</span>';
      })
      .join('');
    var num = poke.number || String(poke.id).padStart(4, '0');
    var _t = poke.types || [];
    var _c1 = TYPE_COLORS[(_t[0] || '').toLowerCase()];
    var _c2 = _t[1] ? TYPE_COLORS[_t[1].toLowerCase()] : null;
    var cardStyle = _c1
      ? (_c2 && _c2 !== _c1
        ? 'background:linear-gradient(var(--surface),var(--surface)) padding-box,linear-gradient(160deg,' + _c1 + ',' + _c2 + ') border-box;border:1.5px solid transparent;box-shadow:0 0 10px ' + _c1 + '40;'
        : 'border:1.5px solid ' + _c1 + '99;box-shadow:0 0 10px ' + _c1 + '40;')
      : '';
    var extraClass = (poke.legendary ? ' card-legendary' : '') + (poke.mythical ? ' card-mythical' : '');
    return (
      '<div class="pokemon-card' + extraClass + '" role="button" tabindex="0" style="' + cardStyle + '"' +
      ' onclick="location.href=\'pokemon.html?id=' + poke.id + '\'"' +
      ' onkeydown="if(event.key===\'Enter\') location.href=\'pokemon.html?id=' + poke.id + '\'"' +
      '>' +
      '<div class="card-inner">' +
      buildSpriteEl(poke.video || poke.sprite, poke.name, 'pokemon-sprite', 'assets/images/placeholder.png') +
      '<h3 class="pokemon-name">' + poke.name + '</h3>' +
      '<p class="pokemon-number">#' + num + '</p>' +
      '<div class="type-badges">' + typeBadges + '</div>' +
      '</div>' +
      '</div>'
    );
  }).join('');

  renderPagination(pokemonList.length);
  setTimeout(playAllVideos, 100);
  staggerGridCards();
}

function renderPagination(total) {
  var el = document.getElementById('pagination');
  if (!el) return;

  var totalPages = Math.ceil(total / State.pageSize);
  if (totalPages <= 1) { el.innerHTML = ''; return; }

  var start = (State.currentPage - 1) * State.pageSize + 1;
  var end = Math.min(State.currentPage * State.pageSize, total);

  el.innerHTML =
    '<div class="pagination">' +
    '<button class="page-btn" onclick="changePage(-1)"' + (State.currentPage === 1 ? ' disabled' : '') + '>← Prev</button>' +
    '<span class="page-info">' + start + '–' + end + ' of ' + total + '</span>' +
    '<button class="page-btn" onclick="changePage(1)"' + (State.currentPage === totalPages ? ' disabled' : '') + '>Next →</button>' +
    '</div>';
}

window.changePage = function (dir) {
  var totalPages = Math.ceil(_filteredList.length / State.pageSize);
  State.currentPage = Math.max(1, Math.min(State.currentPage + dir, totalPages));
  renderGrid(_filteredList);
  window.scrollTo({ top: document.getElementById('pokemonGrid').offsetTop - 80, behavior: 'smooth' });
};

function renderCompletion() {
  var el = document.getElementById('completionBar');
  if (!el) return;
  var total = State.allPokemon.length;
  var max = 1025;
  var pct = Math.min((total / max) * 100, 100).toFixed(1);
  el.innerHTML =
    '<div class="completion-inner">' +
    '<div class="completion-text">' +
    '<span class="completion-label">Pokédex Completion</span>' +
    '<span class="completion-count">' + total + ' / ' + max + '</span>' +
    '</div>' +
    '<div class="completion-track">' +
    '<div class="completion-fill" style="width:' + pct + '%"></div>' +
    '</div>' +
    '</div>';
}

function renderPotd() {
  var el = document.getElementById('potdCard');
  if (!el || !State.allPokemon.length) return;

  // Seed with today's date so it's the same all day
  var today = new Date();
  var seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  var index = seed % State.allPokemon.length;
  var poke = State.allPokemon[index];
  var sprite = poke.video || poke.sprite;
  var num = poke.number || String(poke.id).padStart(4, '0');
  var total = poke.baseStats ? Object.values(poke.baseStats).reduce(function (t, v) { return t + v; }, 0) : 0;
  var types = (poke.types || []).map(function (t) {
    return '<span class="type-badge type-' + t.toLowerCase() + '">' + t + '</span>';
  }).join('');

  el.innerHTML =
    '<a href="pokemon.html?id=' + poke.id + '" class="potd-card">' +
    '<div class="potd-sprite-wrap">' +
    buildSpriteEl(sprite, poke.name, 'potd-sprite') +
    '</div>' +
    '<div class="potd-info">' +
    '<p class="potd-number">#' + num + '</p>' +
    '<h3 class="potd-name">' + poke.name + '</h3>' +
    '<div class="potd-types">' + types + '</div>' +
    (total ? '<p class="potd-bst">' + total + ' BST</p>' : '') +
    '</div>' +
    '<span class="potd-btn">View</span>' +
    '</a>';

  setTimeout(playAllVideos, 100);
}

function renderRecentlyViewed() {
  var section = document.getElementById('recentSection');
  var grid = document.getElementById('recentGrid');
  if (!section || !grid) return;

  var ids = [];
  try { ids = JSON.parse(localStorage.getItem('recentPokemon') || '[]'); } catch (e) { }

  var recent = ids.map(function (id) {
    return State.allPokemon.find(function (p) { return p.id === id; });
  }).filter(Boolean);

  if (!recent.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';

  grid.innerHTML = recent.map(function (poke) {
    var sprite = poke.video || poke.sprite;
    var num = poke.number || String(poke.id).padStart(4, '0');
    var types = (poke.types || []).map(function (t) {
      var tl = t.toLowerCase();
      return '<span class="type-badge type-' + tl + ' type-xs"><img src="assets/images/elements/' + tl + '.png" class="type-icon" alt="" onerror="this.style.display=\'none\'">' + t + '</span>';
    }).join('');
    return (
      '<a href="pokemon.html?id=' + poke.id + '" class="top5-card" style="text-decoration:none;color:inherit;min-width:140px;">' +
      '<div class="top5-sprite-wrap">' + buildSpriteEl(sprite, poke.name, 'top5-sprite') + '</div>' +
      '<p class="pokemon-number">#' + num + '</p>' +
      '<h3 class="pokemon-name" style="font-size:0.9rem">' + poke.name + '</h3>' +
      '<div class="type-badges">' + types + '</div>' +
      '</a>'
    );
  }).join('');

  setTimeout(playAllVideos, 100);
}

function renderTop5() {
  var grid = document.getElementById('top5Grid');
  if (!grid) return;

  function bstOf(stats) {
    return stats ? Object.values(stats).reduce(function (t, v) { return t + v; }, 0) : 0;
  }

  function formKind(name) {
    if (name.indexOf('Gigantamax ') === 0) return 'gigantamax';
    if (name.indexOf('Mega ') === 0) return 'mega';
    return 'variant';
  }

  // Build, for each Pokémon, a list of ALL its qualifying forms (base + mega + gmax + variants),
  // sorted strongest-first. This lets us fall back to a weaker form of the SAME Pokémon
  // if its strongest form gets blocked by the one-mega/one-gigantamax slot rule.
  var perPokemonForms = State.allPokemon.map(function (poke) {
    var forms = [{
      poke: poke,
      formName: null,
      form: null,
      kind: 'base',
      total: bstOf(poke.baseStats),
    }];

    (poke.megaEvolutions || []).forEach(function (f) {
      if (!f.baseStats) return;
      forms.push({ poke: poke, formName: f.name, form: f, kind: formKind(f.name), total: bstOf(f.baseStats) });
    });

    (poke.variants || []).forEach(function (f) {
      if (!f.baseStats) return;
      forms.push({ poke: poke, formName: f.name, form: f, kind: 'variant', total: bstOf(f.baseStats) });
    });

    // Sort strongest first; on a tie, prefer an alt form (mega/gmax/variant) over the plain base form
    forms.sort(function (a, b) {
      if (b.total !== a.total) return b.total - a.total;
      if (a.kind === 'base' && b.kind !== 'base') return 1;
      if (b.kind === 'base' && a.kind !== 'base') return -1;
      return 0;
    });
    return forms;
  });

  // Rank Pokémon by their best possible form, purely for a stable starting order
  perPokemonForms.sort(function (a, b) { return b[0].total - a[0].total; });

  var megaUsed = false;
  var gigaUsed = false;
  var picked = [];
  var remaining = perPokemonForms.slice();

  // Pick one Pokémon at a time. Before each pick, recompute every remaining Pokémon's
  // best STILL-ELIGIBLE form (given the mega/gmax slots already claimed) and take the
  // strongest one overall. This ensures a Pokémon whose best form gets blocked (e.g. its
  // Mega is unavailable because another Pokémon already claimed the one Mega slot) falls
  // back to competing at its real, lower total — instead of grabbing a slot immediately
  // just because it was originally the next Pokémon in line.
  while (picked.length < 6 && remaining.length) {
    var bestCandidate = null;
    var bestIndex = -1;

    for (var r = 0; r < remaining.length; r++) {
      var forms = remaining[r];
      for (var j = 0; j < forms.length; j++) {
        var c = forms[j];
        if (c.kind === 'mega' && megaUsed) continue;
        if (c.kind === 'gigantamax' && gigaUsed) continue;
        // First eligible form (list is sorted strongest-first) is this Pokémon's best offer right now
        if (!bestCandidate || c.total > bestCandidate.total) {
          bestCandidate = c;
          bestIndex = r;
        }
        break;
      }
    }

    if (!bestCandidate) break; // nothing left can qualify (shouldn't normally happen)

    if (bestCandidate.kind === 'mega') megaUsed = true;
    if (bestCandidate.kind === 'gigantamax') gigaUsed = true;
    picked.push(bestCandidate);
    remaining.splice(bestIndex, 1);
  }

  // Re-sort picked entries by their actual chosen total (descending) for display order
  picked.sort(function (a, b) { return b.total - a.total; });

  var medals = ['🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️'];

  grid.innerHTML = picked.map(function (entry, i) {
    var poke = entry.poke;
    var num = poke.number || String(poke.id).padStart(4, '0');

    var displaySprite = poke.video || poke.sprite;
    var displayName = poke.name;
    if (entry.form) {
      displaySprite = entry.form.video || entry.form.sprite || displaySprite;
      displayName = entry.form.name;
    }

    return (
      '<div class="top5-card">' +
      '<div class="top5-rank">' + medals[i] + '</div>' +
      '<div class="top5-sprite-wrap">' +
      buildSpriteEl(displaySprite, displayName, 'top5-sprite', 'assets/images/placeholder.png') +
      '</div>' +
      '<div class="top5-info">' +
      '<p class="top5-number">#' + num + '</p>' +
      '<h3 class="top5-name">' + displayName + '</h3>' +
      '<p class="top5-total">' + entry.total + ' BST' + (entry.formName ? ' <span class="top5-form-tag">' + entry.formName + '</span>' : '') + '</p>' +
      '</div>' +
      '<a href="pokemon.html?id=' + poke.id + '" class="top5-btn">View</a>' +
      '</div>'
    );
  }).join('');
}

function filterPokemon() {
  var search = (document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase().trim() : '');
  var typeFilter = (document.getElementById('typeFilter') ? document.getElementById('typeFilter').value : '');
  var genFilter = (document.getElementById('genFilter') ? document.getElementById('genFilter').value : '');

  var filtered = State.allPokemon.filter(function (p) {
    var matchSearch = p.name.toLowerCase().includes(search) ||
      String(p.id).includes(search) ||
      (p.number || '').includes(search);
    var matchType = !typeFilter || (p.types || []).includes(typeFilter);
    var matchGen = !genFilter || String(p.generation) === genFilter;
    return matchSearch && matchType && matchGen;
  });

  renderGrid(filtered, true);
}


// ====================== Detail Page ======================
function getPokemonById(id) {
  return State.allPokemon.find(function (p) { return p.id === id; }) || null;
}

function buildStatBar(label, value, max) {
  max = max || 255;
  var pct = Math.min((value / max) * 100, 100).toFixed(1);
  var statLabels = {
    hp: 'HP', attack: 'Attack', defense: 'Defense',
    spAttack: 'Sp. Atk', spDefense: 'Sp. Def', speed: 'Speed',
  };
  var color = value >= 100 ? '#3eca6e' : value >= 60 ? '#facc15' : '#f87171';
  return (
    '<div class="stat-row">' +
    '<span class="stat-label">' + (statLabels[label] || label) + '</span>' +
    '<span class="stat-value stat-value-anim" style="color:' + color + '" data-target="' + value + '">0</span>' +
    '<div class="stat-bar-bg">' +
    '<div class="stat-bar-fill stat-bar-anim" style="width:0%;background:' + color + '" data-width="' + pct + '"></div>' +
    '</div>' +
    '</div>'
  );
}

function buildStatTotal(total) {
  return (
    '<div class="stat-row stat-row-total">' +
    '<span class="stat-label">Total</span>' +
    '<span class="stat-value">' + total + '</span>' +
    '<div class="stat-total-line"></div>' +
    '</div>'
  );
}

function buildStatsHTML(stats) {
  if (!stats) return '<p class="text-yellow-400 text-sm">No stats available</p>';
  var bars = Object.entries(stats).map(function (e) { return buildStatBar(e[0], e[1]); }).join('');
  var total = Object.values(stats).reduce(function (t, v) { return t + v; }, 0);
  return bars + buildStatTotal(total);
}

function animateStatBars(container) {
  var fills = (container || document).querySelectorAll('.stat-bar-anim');
  var values = (container || document).querySelectorAll('.stat-value-anim');
  if (!fills.length) return;

  function runAnimation() {
    var delay = 0;
    fills.forEach(function (bar, i) {
      var target = parseFloat(bar.getAttribute('data-width'));
      var valueEl = values[i];
      var targetVal = parseInt(valueEl ? valueEl.getAttribute('data-target') : 0, 10);
      setTimeout(function () {
        bar.style.transition = 'width 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        bar.style.width = target + '%';
        if (valueEl) {
          var start = 0;
          var duration = 700;
          var startTime = null;
          function countUp(ts) {
            if (!startTime) startTime = ts;
            var progress = Math.min((ts - startTime) / duration, 1);
            var ease = 1 - Math.pow(1 - progress, 3);
            valueEl.textContent = Math.round(ease * targetVal);
            if (progress < 1) requestAnimationFrame(countUp);
          }
          requestAnimationFrame(countUp);
        }
      }, delay);
      delay += 80;
    });
    fills.forEach(function (bar) { bar.classList.remove('stat-bar-anim'); });
    values.forEach(function (v) { v.classList.remove('stat-value-anim'); });
  }

  var section = fills[0].closest('.detail-section') || fills[0].closest('section') || fills[0];
  // Use a one-shot observer for stat bars
  if ('IntersectionObserver' in window) {
    var _statIO = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        runAnimation();
        _statIO.disconnect();
      }
    }, { threshold: 0.2, rootMargin: '0px 0px -20px 0px' });
    _statIO.observe(section);
  } else {
    setTimeout(runAnimation, 100);
  }
}

function buildTypeBadges(types, size) {
  size = size || '';
  return (types || [])
    .map(function (t) {
      var tl = t.toLowerCase();
      var icon = '<img src="assets/images/elements/' + tl + '.png" class="type-icon" alt="" onerror="this.style.display=\'none\'">';
      return '<span class="type-badge type-' + tl + ' ' + size + '">' + icon + t + '</span>';
    })
    .join('');
}

function buildDrops(drops) {
  if (!drops || !drops.length) return '<p class="text-gray-500 text-sm">No drops data</p>';
  return drops.map(function (drop) {
    return (
      '<div class="drop-row">' +
      '<div class="drop-icon">' +
      (drop.image
        ? '<img src="' + drop.image + '" alt="' + drop.item + '" onerror="this.parentElement.innerHTML=\'📦\'">'
        : '&#128230;') +
      '</div>' +
      '<div class="drop-info">' +
      '<p class="drop-name">' + drop.item + '</p>' +
      '<p class="drop-meta"><span class="text-green-400 font-semibold">' + drop.chance + '%</span> &nbsp;&middot;&nbsp; Qty: ' + drop.quantity + '</p>' +
      '</div>' +
      '</div>'
    );
  }).join('');
}


// ====================== Evolution Section ======================

// ====================== Spawn Carousel ======================

// Biome group definitions — used to show related biomes on hover
var BIOME_GROUPS = {
  'hills': ['#minecraft:hill', 'highlands', '#c:hill', '#c:mountain/slope', '#c:windswept', 'biomesoplenty:jade_cliffs', 'biomesoplenty:mediterranean_forest', 'terralith:blooming_valley', 'terralith:forested_highlands', 'terralith:lavender_valley', 'terralith:lush_valley', 'terralith:moonlight_valley', 'terralith:sakura_valley', 'terralith:savanna_slopes', 'terralith:temperate_highlands', 'terralith:yosemite_lowlands', 'wythers:autumnal_crags', 'wythers:ayers_rock', 'wythers:icy_crags', 'wythers:old_growth_taiga_crags', 'wythers:taiga_crags', 'wythers:temperate_rainforest_crags', 'wythers:thermal_taiga_crags', 'wythers:windswept_jungle'],
  'volcanic': ['biomesoplenty:volcanic_plains', 'biomesoplenty:volcano', 'darkerdepths:molten_cavern', 'terralith:cave/mantle_caves', 'terralith:volcanic_crater', 'terralith:volcanic_peaks', 'wythers:icy_volcano', 'wythers:tropical_volcano', 'wythers:volcano', 'wythers:volcanic_chamber', 'wythers:volcanic_crater'],
  'nether/basalt': ['minecraft:basalt_deltas', 'betternether:flooded_deltas', 'cinderscapes:blackstone_shales', 'incendium:ash_barrens', 'incendium:volcanic_deltas', 'incendium:withered_forest'],
  'arid': ['badlands', 'desert', 'savanna'],
  'freshwater': ['river', 'swamp', 'wythers:desert_lakes', 'wythers:guelta', 'wythers:tropical_forest_river'],
  'jungle': ["#minecraft:jungle", '#c:jungle', 'terralith:cave/underground_jungle', 'biomesoplenty:floodplain', 'biomesoplenty:rainforest', 'blooming_biosphere:rainforest', 'clifftree:tropical_river', 'wythers:dripleaf_swamp', 'wythers:eucalyptus_deanei_forest', 'wythers:highland_tropical_rainforest', 'wythers:humid_tropical_grassland', 'wythers:jungle_canyon', 'wythers:subtropical_forest', 'wythers:subtropical_forest_edge', 'wythers:subtropical_grassland', 'wythers:tropical_forest', 'wythers:tropical_forest_canyon', 'wythers:tropical_grassland', 'wythers:tropical_island', 'wythers:tropical_rainforest'],
  'temperate': ['forest', 'plains'],
  'freezing': ['minecraft:frozen_river', 'minecraft:jagged_peaks', 'minecraft:snowy_beach', 'minecraft:snowy_plains', 'minecraft:snowy_slopes', 'frozen_ocean', 'glacial', 'snowy', '#c:snowy', 'clifftree:frozen_caves', 'terralith:emerald_peaks', 'terralith:scarlet_mountains', 'terralith:skylands_winter', 'terralith:snowy_badlands', 'wythers:crimson_tundra', 'wythers:frozen_island', 'wythers:snowy_bog', 'wythers:snowy_canyon', 'wythers:snowy_peaks', 'wythers:snowy_tundra'],
  'sky': ['terralith:skylands_autumn', 'terralith:skylands_spring', 'terralith:skylands_summer', 'terralith:skylands_winter'],
  'spooky': ['minecraft:dark_forest', '#c:spooky', '#wythers:dark_forest', 'biomesoplenty:ominous_woods', 'biomeswevegone:ebony_woods', 'biomeswevegone:overgrowth_woodlands', 'biomeswevegone:pale_bog', 'biomeswevegone:weeping_witch_forest', 'wythers:ancient_taiga', 'wythers:tangled_forest', 'wythers:twilight_meadow'],
  'overworld': ['#minecraft:overworld', '#c: overworld'],
  'ocean': ['#minecraft:ocean', 'cold_ocean', 'deep_ocean', 'frozen_ocean', 'lukewarm_ocean', 'temperate_ocean', 'warm_ocean', '#c:ocean', 'clifftree:stone_ocean'],
  'desert': ['minecraft:desert', '#c:desert', '#clifftree:desert', '#wythers:desert', 'biomesoplenty:lush_desert', 'clifftree:desert_cliff', 'darkerdepths:sandy_catacombs', 'terralith:ancient_sands', 'terralith:desert_canyon', 'terralith:cave/desert_caves', 'terralith:desert_oasis', 'terralith:desert_spires', 'terralith:lush_desert', 'terralith:red_oasis', 'terralith:sandstone_valley', 'wythers:badlands_desert', 'wythers:desert_island', 'wythers:kwongan_heath', 'wythers:outback_desert', 'wythers:red_desert', 'wythers:sandy_jungle'],
  'forest': ['#minecraft:forest', 'minecraft:cherry_grove', '#c:flower_forest', '#c:forest', '#c:tree/deciduous', 'biomesoplenty:lavender_forest', 'biomesoplenty:maple_woods', 'biomesoplenty:mediterranean_forest', 'biomesoplenty:mystic_grove', 'biomesoplenty:old_growth_woodland', 'biomesoplenty:ominous_woods', 'biomesoplenty:orchard', 'biomesoplenty:origin_valley', 'biomesoplenty:prairie', 'biomesoplenty:seasonal_forest', 'biomesoplenty:seasonal_orchard', 'biomesoplenty:woodland', 'blooming_biosphere:autumnal_forest', 'blooming_biosphere:oak_woodland', 'terralith:alpha_islands', 'terralith:alpha_islands_winter','terralith:blooming_valley', 'terralith:forested_highlands', 'terralith:lavender_forest', 'terralith:lavender_valley', 'terralith:mirage_isles', 'terralith:sakura_grove', 'terralith:sakura_valley', 'terralith:temperate_highlands', 'wythers:dry_tropical_forest', 'wythers:birch_taiga', 'wythers:boreal_forest_red', 'wythers:boreal_forest_yellow', 'wythers:tangled_forest', 'wythers:tropical_forest'],
  'snowy forest': ['biomesoplenty:auroral_garden', 'biomesoplenty:muskeg', 'biomesoplenty:snowy_maple_woods', 'blooming_biosphere:snowy_cherry_grove', 'terralith:alpha_islands_winter', 'terralith:ice_marsh', 'terralith:siberian_grove', 'terralith:snowy_cherry_grove', 'terralith:snowy_cherry_grove', 'terralith:snowy_maple_forest', 'wythers:huangshan_highlands', 'wythers:jade_highlands', 'wythers:snowy_fen'],
  'snowy taiga': ['minecraft:grove', 'minecraft:snowy_taiga', 'biomesoplenty:snowy_coniferous_forest', 'biomesoplenty:snowy_coniferous_forest', 'biomesoplenty:snowy_maple_woods', 'clifftree:snowy_old_growth_taiga', 'terralith:alpine_grove', 'terralith:cold_shrubland', 'terralith:siberian_grove', 'terralith:snowy_maple_forest', 'terralith:snowy_shield', 'terralith:wintry_forest', 'terralith:wintry_lowlands', 'wythers:cold_island', 'wythers:snowy_thermal_taiga', 'wythers:deep_snowy_taiga'],
  'tundra': ['minecraft:ice_spikes', 'minecraft:snowy_plains', '#c:snowy_plains', 'biomesoplenty:cold_desert', 'biomesoplenty:cold_desert', 'biomesoplenty:muskeg', 'biomesoplenty:snowy_fir_clearing', 'biomesoplenty:tundra', 'biomeswevegone:crimson_tundra', 'clifftree:bog', 'clifftree:tundra', 'terralith:cold_shrubland', 'terralith:gravel_desert', 'terralith:rocky_shrubland', 'terralith:snowy_badlands', 'terralith:yellowstone', 'wythers:crimson_tundra', 'wythers:frigid_island', 'wythers:ice_cap', 'wythers:icy_crags', 'wythers:snowy_tundra', 'wythers:tundra'],
  'nether/quartz': ['cinderscapes:quartz_cavern', 'incendium:quartz_flats'],
  "frozen ocean": ['minecraft:deep_frozen_ocean', 'minecraft:frozen_ocean', 'terralith:frozen_cliffs', 'wythers:deep_icy_ocean', 'wythers:icy_ocean'],
  "beach": ['#minecraft:beach', 'biomesoplenty:dune_beach', 'wythers:guelta', 'wythers:sand_dunes'],
  "tropical island": ['biomesoplenty:tropics', 'wythers:tropical_beach', 'wythers:tropical_island', 'wythers:tropical_volcano'],
  "nether/forest": ['betternether:nether_jungle', 'betternether:nether_swampland', 'betternether:nether_swampland_terraces', 'betternether:old_swampland', 'betternether:upside_down_forest'],
  "nether/fungus": ['minecraft:crimson_forest', 'minecraft:warped_forest', 'betternether:crimson_glowing_woods', 'betternether:crimson_pinewood', 'betternether:nether_mushroom_forest', 'betternether:nether_mushroom_forest_edge', 'betternether:old_fungiwoods', 'betternether:old_warped_woods', 'netherdescent:crimson_gardens', 'netherdescent:embur_bog', 'netherdescent:embur_bog', 'netherdescent:wailing_garth', 'cinderscapes:luminous_grove', 'gardens_of_the_dead:whistling_woods', 'gardens_of_the_dead:soulblight_forest', 'incendium:inverted_forest'],
  "lush": ['minecraft:lush_caves', '#c:lush', 'biomeswevegone:lush_stacks', 'terralith:cave/fungal_caves', 'terralith:cave/underground_jungle', 'wythers:dripleaf_swamp', 'wythers:lichenous_caves', 'wythers:lichenous_dripstone_caves', 'wythers:lush_dripstone_caves', 'wythers:lush_fungous_dripstone_caves', 'wythers:lush_shroom_caves']
};

function getBiomeGroupTooltip(biomeName) {
  var key = biomeName.toLowerCase().trim();
  var related = BIOME_GROUPS[key];
  if (!related) return null;
  return related;
}

// Turn raw tag strings like "terralith:blooming_valley" or "#c:is_hill"
// into readable labels like "Blooming Valley" / "Is Hill"
function formatBiomeTagName(raw) {
  var s = raw.replace(/^#/, '');           // strip leading #
  var parts = s.split(':');
  var name = parts[parts.length - 1];      // take part after namespace
  name = name.replace(/\//g, ' / ');       // slashes -> spaces around slash
  name = name.replace(/_/g, ' ');          // underscores -> spaces
  name = name.replace(/\s+/g, ' ').trim();
  // Title case each word
  name = name.split(' ').map(function (w) {
    if (!w) return w;
    if (w === '/') return w;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
  return name;
}

// Map a raw tag's namespace/prefix to a colour key + display label
function getBiomeTagNamespace(raw) {
  var s = raw.replace(/^#/, '');
  if (s.indexOf(':') !== -1) {
    var ns = s.split(':')[0].toLowerCase();
    return ns; // e.g. 'terralith', 'wythers', 'biomesoplenty', 'minecraft', 'c'
  }
  return 'other';
}

var NAMESPACE_LABELS = {
  'minecraft': 'Vanilla',
  'c': 'Common Tag',
  'terralith': 'Terralith',
  'wythers': 'Wythers',
  'biomesoplenty': 'Biomes O\' Plenty',
  'darkerdepths': 'Darker Depths',
  'betternether': 'BetterNether',
  'cinderscapes': 'Cinderscapes',
  'incendium': 'Incendium',
  'blooming_biosphere': 'Blooming Biosphere',
  'clifftree': 'CliffTree',
  'biomeswevegone': 'Oh The Biomes We\'ve Gone',
  'netherdescent': 'Nether Descent',
  'gardens_of_the_dead': 'Gardens of the Dead',
  'cobblemon': 'Cobblemon',
  'other': 'Other'
};

// Build a compact, scrollable popover listing related biome tags as colour-coded chips,
// with a legend showing which colour maps to which mod/namespace
function buildBiomeRelatedPopover(related) {
  if (!related || !related.length) return '';

  var seenNamespaces = {};
  var chips = related.map(function (r) {
    var ns = getBiomeTagNamespace(r);
    seenNamespaces[ns] = true;
    return '<span class="biome-related-chip ns-' + ns + '">' + formatBiomeTagName(r) + '</span>';
  }).join('');

  var legendItems = Object.keys(seenNamespaces).sort().map(function (ns) {
    var label = NAMESPACE_LABELS[ns] || (ns.charAt(0).toUpperCase() + ns.slice(1));
    return '<span class="biome-legend-item"><span class="biome-legend-dot ns-' + ns + '"></span>' + label + '</span>';
  }).join('');

  return (
    '<div class="biome-tooltip">' +
    '<div class="biome-tooltip-title">Related biomes <span class="biome-tooltip-count">' + related.length + '</span></div>' +
    '<div class="biome-tooltip-chips">' + chips + '</div>' +
    '<div class="biome-tooltip-legend">' + legendItems + '</div>' +
    '</div>'
  );
}

function buildSpawnSection(poke) {
  // Normalise: support both legacy flat fields and future spawnOptions array
  var options = poke.spawnOptions || [];
  if (!options.length) {
    // Build single option from flat fields
    options = [{
      bucket: poke.spawnBucket || null,
      level: poke.spawnLevel || null,
      context: poke.spawnContext || null,
      preset: poke.spawnPreset || null,
      biomes: poke.spawnBiomes || [],
      notBiomes: poke.notBiomes || poke.notbiomes || [],
      blocks: poke.blocks || null,
      isRaining: poke.isRaining,
      shipwreck_coves_structure: poke.shipwreck_coves_structure,
      isSlimeChunk: poke.isSlimeChunk,
      isDay: poke.isDay,
      seeSky: poke.seeSky,
      isWater: poke.isWater,
      village_Structure: poke.village_Structure,
      requirements: poke.spawnRequirements || null,
      label: null
    }];
  } else {
    // Normalise each provided spawnOption — JSON may use 'notbiomes' (lowercase)
    options = options.map(function (opt) {
      return Object.assign({}, opt, {
        notBiomes: opt.notBiomes || opt.notbiomes || [],
        blocks: opt.blocks || null
      });
    });
  }

  var total = options.length;

 function buildBiomeTags(biomes, variant) {
  return (biomes || []).map(function (b) {
    var biomeLower = b.toLowerCase();
    var isNether = biomeLower.indexOf('nether') !== -1;
    var isAether = biomeLower.indexOf('aether') !== -1;

    var colorClass = variant === 'not'
      ? 'biome-not'
      : (isAether
          ? 'biome-aether'
          : (isNether ? 'biome-nether' : 'biome-normal'));

    var related = getBiomeGroupTooltip(b);
    var tooltip = related ? buildBiomeRelatedPopover(related) : '';

    return '<span class="biome-tag ' + colorClass +
      (related ? ' has-tooltip' : '') +
      '">' + b + tooltip + '</span>';
  }).join('') || '<span class="spawn-empty">' +
    (variant === 'not' ? 'None' : 'Unknown') +
    '</span>';
}

  function buildSlide(opt, idx) {
    var biomeHTML = buildBiomeTags(opt.biomes, 'normal');
    var notBiomeHTML = buildBiomeTags(opt.notBiomes, 'not');
    var hasNotBiomes = (opt.notBiomes || []).length > 0;

    var reqLines = [];
    if (opt.isRaining === true) reqLines.push({ label: 'Raining', value: 'Required' });
    if (opt.isRaining === false) reqLines.push({ label: 'Raining', value: 'Must not be raining' });
    if (opt.isWater === true) reqLines.push({ label: 'Requirement', value: 'Needs to be in water' });
    if (opt.isWater === false) reqLines.push({ label: 'Requirement', value: 'Cant be in water' });
    if (opt.village_Structure === true) reqLines.push({ label: 'Structure', value: 'Must be in a Village' });
    if (opt.village_Structure === false) reqLines.push({ label: 'Structure', value: 'Cant be in a Village' });
    if (opt.shipwreck_coves_structure === true) reqLines.push({ label: 'Structure', value: 'Must be in a Shipwreck Coves' });
    if (opt.shipwreck_coves_structure === false) reqLines.push({ label: 'Structure', value: 'Cant be in a Shipwreck Coves' });
    if (opt.isSlimeChunk === true) reqLines.push({ label: 'Slime Chunk', value: 'Required' });
    if (opt.isSlimeChunk === false) reqLines.push({ label: 'Slime Chunk', value: 'Must not be a slime chunk' });
    if (opt.isDay === true) reqLines.push({ label: 'Time range', value: 'Day' });
    if (opt.isDay === false) reqLines.push({ label: 'Time range', value: 'Not during Day' });
    if (opt.seeSky === true) reqLines.push({ label: 'See sky', value: 'Required' });
    if (opt.seeSky === false) reqLines.push({ label: 'See sky', value: 'Must not see sky' });
    if (opt.minY != null && opt.maxY != null) reqLines.push({ label: 'Y Level', value: opt.minY + ' to ' + opt.maxY });
    else if (opt.minY != null) reqLines.push({ label: 'Y Level', value: opt.minY + ' and above' });
    else if (opt.maxY != null) reqLines.push({ label: 'Y Level', value: opt.maxY + ' and below' });
    if (opt.requirements && opt.requirements !== 'N/A') reqLines.push({ label: 'Other', value: opt.requirements });
    if (opt.blocks) {
      var blockChips = opt.blocks.split(',').map(function(b) {
        var name = b.trim();
        var ns = name.indexOf(':') !== -1 ? name.split(':')[0] : '';
        var label = name.indexOf(':') !== -1 ? name.split(':')[1].replace(/_/g, ' ') : name.replace(/_/g, ' ');
        var chipClass = ns === 'aether' ? 'biome-tag biome-block biome-block-aether' : 'biome-tag biome-block';
        return '<span class="' + chipClass + '" title="' + name + '">' + label + '</span>';
      }).join(' ');
      reqLines.push({ label: 'Blocks', value: blockChips, raw: true, chips: true });
    }
    var reqHTML = reqLines.length
      ? '<div class="spawn-card"><h3 class="spawn-card-title">Requirements</h3><ul class="spawn-detail-list">' +
      reqLines.map(function (r) { return r.chips ? '<li class="spawn-req-chips-row"><span>' + r.label + ':</span><div class="spawn-req-chips">' + r.value + '</div></li>' : '<li><span>' + r.label + ':</span> ' + r.value + '</li>'; }).join('') +
      '</ul></div>'
      : '<div class="spawn-card"><h3 class="spawn-card-title">Requirements</h3><p class="spawn-empty">None</p></div>';

    return (
      '<div class="spawn-slide" data-index="' + idx + '" style="display:' + (idx === 0 ? 'flex' : 'none') + '">' +
      '<div class="spawn-card">' +
      '<h3 class="spawn-card-title">Spawning Details</h3>' +
      '<ul class="spawn-detail-list">' +
      (opt.context && opt.context !== '-' ? '<li><span>Context:</span> ' + opt.context + '</li>' : '') +
      (opt.bucket ? '<li><span>Bucket:</span> ' + opt.bucket + '</li>' : '') +
      (opt.level ? '<li><span>Level:</span> ' + opt.level + '</li>' : '') +
      (opt.preset ? '<li><span>Preset:</span> ' + opt.preset + '</li>' : '') +
      '</ul>' +
      '</div>' +
      reqHTML +
      '<div class="spawn-card spawn-card-biomes">' +
      '<h3 class="spawn-card-title">Biomes</h3>' +
      '<p class="spawn-biome-label">WILL SPAWN IN BIOMES:</p>' +
      '<div class="biome-tags">' + biomeHTML + '</div>' +
      (hasNotBiomes ?
        '<p class="spawn-biome-label spawn-biome-label-not">WON\'T SPAWN IN BIOMES:</p>' +
        '<div class="biome-tags">' + notBiomeHTML + '</div>'
        : '') +
      '</div>' +
      '</div>'
    );
  }

  var slidesHTML = options.map(function (opt, i) { return buildSlide(opt, i); }).join('');

  var dotsHTML = total > 1
    ? options.map(function (_, i) {
      return '<button class="spawn-dot' + (i === 0 ? ' active' : '') + '" onclick="goSpawnSlide(' + i + ')" aria-label="Spawn option ' + (i + 1) + '"></button>';
    }).join('')
    : '';

  var navHTML = total > 1
    ? '<div class="spawn-nav">' +
    '<button class="spawn-nav-btn" onclick="prevSpawnSlide()" aria-label="Previous">&#8249;</button>' +
    '<div class="spawn-dots">' + dotsHTML + '</div>' +
    '<button class="spawn-nav-btn" onclick="nextSpawnSlide()" aria-label="Next">&#8250;</button>' +
    '</div>'
    : '';

  var counterHTML = total > 1
    ? '<span class="spawn-counter" id="spawnCounter">1 / ' + total + '</span>'
    : '';

  return (
    '<section class="detail-section spawn-section">' +
    '<div class="spawn-header">' +
    '<div>' +
    '<p class="spawn-label">SPAWNING</p>' +
    '<h2 class="spawn-title">Where does ' + poke.name + ' spawn in Cobblemon?</h2>' +
    '</div>' +
    counterHTML +
    '</div>' +
    navHTML +
    '<div class="spawn-slides" id="spawnSlides">' +
    slidesHTML +
    '</div>' +
    '</section>'
  );
}

window._spawnIndex = 0;

function goSpawnSlide(idx) {
  var slides = document.querySelectorAll('.spawn-slide');
  var dots = document.querySelectorAll('.spawn-dot');
  var counter = document.getElementById('spawnCounter');
  if (!slides.length) return;
  idx = Math.max(0, Math.min(idx, slides.length - 1));

  slides.forEach(function (s, i) {
    s.style.display = i === idx ? 'flex' : 'none';
    s.style.animation = i === idx ? 'spawnSlideIn 0.3s cubic-bezier(0.22,1,0.36,1) both' : '';
  });
  dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
  if (counter) counter.textContent = (idx + 1) + ' / ' + slides.length;
  window._spawnIndex = idx;
}

window.nextSpawnSlide = function () { goSpawnSlide(window._spawnIndex + 1); };
window.prevSpawnSlide = function () { goSpawnSlide(window._spawnIndex - 1); };
window.goSpawnSlide = goSpawnSlide;

function buildEvolutionSection(poke) {
  // Support two formats:
  //   legacy:  poke.evolutions = [ ...flat/branch array... ]  (single chain)
  //   new:     poke.evolutionChains = [ { label, chain: [...] }, ... ]  (multiple chains)
  var chains = [];

  if (poke.evolutionChains && poke.evolutionChains.length) {
    chains = poke.evolutionChains;
  } else if (poke.evolutions && poke.evolutions.length) {
    chains = [{ label: null, chain: poke.evolutions }];
  }

  if (!chains.length) return '';

  // ---- helpers ----
  function evoLabel(evo) {
    var parts = [];
    if (evo.level)        parts.push('Lv. ' + evo.level);
    if (evo.method)       parts.push(evo.method);
    if (evo.requiresMove) parts.push('\u{1F4D6} ' + evo.requiresMove);
    return parts.length ? parts.join(' \u00B7 ') : '?';
  }

  function evoCard(evo) {
    // evo.sprite overrides the lookup so variant forms can show their own sprite
    var evoPoke   = getPokemonById(evo.id);
    var sprite    = evo.sprite || (evoPoke ? (evoPoke.video || evoPoke.sprite) : null);
    var isCurrent = evo.id === poke.id && !evo.variantForm;
    var isCurrentVariant = evo.variantForm && poke.variants &&
      poke.variants.some(function(v) { return v.name === evo.variantForm; });
    var spriteEl  = sprite
      ? buildSpriteEl(sprite, evo.name, 'evo-sprite', 'assets/images/placeholder.png')
      : '<div class="evo-sprite-placeholder">?</div>';
    return (
      '<a href="pokemon.html?id=' + evo.id + '" class="evo-card' + ((isCurrent || isCurrentVariant) ? ' evo-current' : '') + '">' +
      '<div class="evo-sprite-wrap">' + spriteEl + '</div>' +
      '<p class="evo-name">' + evo.name + '</p>' +
      '<p class="evo-number">#' + String(evo.id).padStart(4, '0') + '</p>' +
      '</a>'
    );
  }

  function evoArrow(label) {
    return (
      '<div class="evo-arrow">' +
      '<div class="evo-arrow-line"></div>' +
      '<span class="evo-arrow-label">' + label + '</span>' +
      '<div class="evo-arrow-tip">▶</div>' +
      '</div>'
    );
  }

  function renderChain(chainArr) {
    var html = '';
    var isFirst = true;
    chainArr.forEach(function(entry) {
      if (entry.branches) {
        var branchHtml = '<div class="evo-branch-group">';
        entry.branches.forEach(function(branch) {
          branchHtml +=
            '<div class="evo-branch-path">' +
            evoArrow(evoLabel(branch)) +
            evoCard(branch) +
            '</div>';
        });
        branchHtml += '</div>';
        html += branchHtml;
      } else {
        if (!isFirst) html += evoArrow(evoLabel(entry));
        html += evoCard(entry);
        isFirst = false;
      }
    });
    return html;
  }

  // ---- render all chains ----
  var chainsHtml = chains.map(function(c) {
    return (
      '<div class="evo-chain-row">' +
      (c.label ? '<div class="evo-chain-label">' + c.label + '</div>' : '') +
      '<div class="evo-chain evo-chain-branching">' + renderChain(c.chain) + '</div>' +
      '</div>'
    );
  }).join('');

  return (
    '<section class="detail-section">' +
    '<h2 class="section-title">Evolution Chart</h2>' +
    '<div class="evo-chains-wrap">' + chainsHtml + '</div>' +
    '</section>'
  );
}


function buildRangeBar(stat) {
  if (!stat) return '';
  var min = Math.min(stat.min, stat.max);
  var max = Math.max(stat.min, stat.max);
  var leftPct = min;
  var widthPct = max - min;
  return (
    '<div class="ride-bar-bg">' +
    '<div class="ride-bar-fill" style="left:' + leftPct + '%;width:' + widthPct + '%"></div>' +
    '</div>'
  );
}

function buildMountCard(title, stats) {
  if (!stats) return '';
  var labels = {
    acceleration: 'Acceleration',
    jump: 'Jump',
    skill: 'Skill',
    speed: 'Speed',
    stamina: 'Stamina',
  };

  var rows = Object.entries(labels).map(function (entry) {
    var key = entry[0];
    var label = entry[1];
    var stat = stats[key];
    if (!stat) return '';
    return (
      '<div class="ride-stat-row">' +
      '<div class="ride-stat-header">' +
      '<span class="ride-stat-label">' + label + '</span>' +
      '<span class="ride-stat-range">' + stat.min + ' \u2013 ' + stat.max + '</span>' +
      '</div>' +
      buildRangeBar(stat) +
      '</div>'
    );
  }).join('');

  var icons = {
    'Air Mount': 'assets/images/air_mount.png',
    'Ground Mount': 'assets/images/ground_mount.png',
    'Swimming Mount': 'assets/images/swimming_mount.png'
  };
  var icon = '<img src="' + (icons[title] || 'assets/images/ground_mount.png') + '" alt="' + title + '" class="mount-icon">';

  return (
    '<div class="mount-card">' +
    '<h3 class="mount-card-title">' + icon + ' ' + title + '</h3>' +
    '<div class="ride-stats">' + rows + '</div>' +
    '</div>'
  );
}

// Case-insensitive lookup for riding sub-objects (JSON may use 'Swimming', 'swimming', etc.)
function getRidingKey(riding, key) {
  if (!riding) return null;
  if (riding[key]) return riding[key];
  var lower = key.toLowerCase();
  for (var k in riding) {
    if (k.toLowerCase() === lower) return riding[k];
  }
  return null;
}

function buildRidingSection(poke) {
  if (!poke.rideable) return '';

  var riding = poke.riding || {};
  var hasAir = poke.flying && getRidingKey(riding, 'air');
  var groundData = getRidingKey(riding, 'ground');
  var swimData = getRidingKey(riding, 'swimming');

  var ground = buildMountCard('Ground Mount', groundData);
  var air = hasAir ? buildMountCard('Air Mount', getRidingKey(riding, 'air')) : '';
  var swimming = swimData ? buildMountCard('Swimming Mount', swimData) : '';

  return (
    '<section class="detail-section riding-section">' +
    '<h2 class="section-title">How to ride ' + poke.name + '</h2>' +
    '<p class="section-subtitle">Mount stats scale with level and show the possible range</p>' +
    '<div class="mount-grid">' +
    ground +
    air +
    swimming +
    '</div>' +
    '</section>'
  );
}


// ====================== Decks Section ======================
function resolveFormVideo(poke, version) {
  var v = version || 'Normal';
  if (v === 'Normal') return poke.video || null;
  if (v === 'Shiny') return poke.shinyVideo || null;
  var forms = (poke.megaEvolutions || []).concat(poke.variants || []);
  for (var i = 0; i < forms.length; i++) {
    if (v === forms[i].name) return forms[i].video || null;
    if (v === forms[i].name + ' Shiny') return forms[i].shinyVideo || null;
  }
  // Unknown version (e.g. pokemon name used as version) — fall back to Normal
  return poke.video || null;
}


function resolveFormSprite(poke, version) {
  var v = version || 'Normal';

  // Shiny base
  if (v === 'Shiny') {
    return poke.shinySprite || poke.sprite;
  }

  // Normal base
  if (v === 'Normal') {
    return poke.sprite;
  }

  // Mega / Gigantamax / Variant forms
  var forms = (poke.megaEvolutions || []).concat(poke.variants || []);
  for (var i = 0; i < forms.length; i++) {
    var f = forms[i];
    if (v === f.name) {
      return f.sprite;
    }
    if (v === f.name + ' Shiny') {
      return f.shinySprite || f.sprite;
    }
  }

  // Unknown version — fall back to Normal sprite
  return poke.sprite;
}


// ====================== Variant Progress Tracker ======================
// Variants are tracked separately from base Pokémon, keyed as "id:VariantName"
var _variantProgress = {}; // { "id:VariantName": { seen: bool, captured: bool } }

function loadVariantProgress() {
  try {
    var saved = localStorage.getItem('variantProgress');
    if (saved) _variantProgress = JSON.parse(saved);
  } catch (e) { }
}

function saveVariantProgress() {
  try { localStorage.setItem('variantProgress', JSON.stringify(_variantProgress)); } catch (e) { }
}

function variantKey(pokeId, variantName) {
  return pokeId + ':' + variantName;
}

// Build the "Variant Tracker" meta-card shown on a Pokémon's detail page
function buildVariantTrackerCard(poke) {
  if (!poke.variants || !poke.variants.length) return '';

  loadVariantProgress();

  // "Normal" form counts as a variant too — shown first
  var allEntries = [{ name: poke.name, _isBase: true }].concat(poke.variants);

  var rows = allEntries.map(function (variant) {
    var key = variantKey(poke.id, variant.name);
    var p = _variantProgress[key] || {};
    var isSeen = p.seen || p.captured;
    var isCap = p.captured;

    return (
      '<div class="variant-tracker-row">' +
      '<span class="variant-tracker-name">' + variant.name + '</span>' +
      '<div class="variant-tracker-btns">' +
      '<button class="pdex-btn pdex-btn-seen' + (isSeen ? ' active' : '') + '" ' +
      'onclick="toggleVariantSeen(' + poke.id + ', \'' + variant.name.replace(/'/g, "\\'") + '\')" title="Mark as Seen">\uD83D\uDC41</button>' +
      '<button class="pdex-btn pdex-btn-cap' + (isCap ? ' active' : '') + '" ' +
      'onclick="toggleVariantCaptured(' + poke.id + ', \'' + variant.name.replace(/'/g, "\\'") + '\')" title="Mark as Captured">\u2713</button>' +
      '</div>' +
      '</div>'
    );
  }).join('');

  return (
    '<div class="meta-card variant-tracker-card">' +
    '<h3 class="meta-title">Variant Forms</h3>' +
    '<div class="variant-tracker-list">' + rows + '</div>' +
    '</div>'
  );
}

window.toggleVariantSeen = function (pokeId, variantName) {
  var key = variantKey(pokeId, variantName);
  var p = _variantProgress[key] || {};
  if (p.seen && !p.captured) {
    delete _variantProgress[key];
  } else {
    p.seen = !p.seen;
    if (!p.seen) p.captured = false;
    _variantProgress[key] = p;
  }
  saveVariantProgress();
  // Re-render the tracker card in place
  var card = document.querySelector('.variant-tracker-card');
  if (card) {
    var poke = window._shinyData ? window._shinyData.poke : null;
    if (poke) card.outerHTML = buildVariantTrackerCard(poke);
  }
};

window.toggleVariantCaptured = function (pokeId, variantName) {
  var key = variantKey(pokeId, variantName);
  var p = _variantProgress[key] || {};
  p.captured = !p.captured;
  if (p.captured) p.seen = true;
  _variantProgress[key] = p;
  saveVariantProgress();
  var card = document.querySelector('.variant-tracker-card');
  if (card) {
    var poke = window._shinyData ? window._shinyData.poke : null;
    if (poke) card.outerHTML = buildVariantTrackerCard(poke);
  }
};

function buildDecksSection(poke) {
  if (!poke.decks || !poke.decks.length) return '';

  // Max possible power for 4 moves (4 x 150 = 600)
  var MAX_DECK_POWER = 600;

  var cards = poke.decks.map(function (deck) {
    var sprite = resolveFormSprite(poke, deck.version);
    var logoPath = deck.logo || '';    // Calculate deck strength
    var totalPower = (deck.moves || []).reduce(function (sum, moveName) {
      var move = window._allMoves ? window._allMoves[moveName] : null;
      return sum + (parseInt(move && move.power) || 0);
    }, 0);
    var strengthPct = Math.min((totalPower / MAX_DECK_POWER) * 100, 100).toFixed(1);
    var strengthColor = totalPower >= 400 ? '#4ade80' : totalPower >= 250 ? '#facc15' : '#f87171';

    var movesList = (deck.moves || []).map(function (moveName) {
      var move = window._allMoves ? window._allMoves[moveName] : null;
      var typeClass = move ? 'type-' + move.type.toLowerCase() : '';
      var typeLabel = move ? move.type : '';
      var power = move && move.power && move.power !== '-' ? move.power : '—';
      var accuracy = move && move.accuracy ? move.accuracy : '—';
      var pp = move && move.pp ? move.pp : '—';
      var category = move && move.category ? move.category : '—';

      return (
        '<div class="deck-move">' +
        '<div class="deck-move-top">' +
        '<span class="deck-move-name">' + moveName + '</span>' +
        (typeLabel ? '<span class="type-badge ' + typeClass + ' type-xs"><img src="assets/images/elements/' + move.type.toLowerCase() + '.png" class="type-icon" alt="" onerror="this.style.display=\'none\'">' + typeLabel + '</span>' : '') +
        '</div>' +
        '<div class="deck-move-stats">' +
        '<span title="Power">Pwr: ' + power + '</span>' +
        '<span title="Accuracy">Acc: ' + accuracy + '</span>' +
        '<span title="PP">PP: ' + pp + '</span>' +
        '<span title="Category" class="deck-move-cat">' + category + '</span>' +
        '</div>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="deck-card">' +
      '<div class="deck-sprite-wrap">' +
      (function () {
        var isShinyDeck = /shiny/i.test(deck.version || '');
        var baseName = (deck.version || '').replace(/shiny\s*/i, '').trim() || 'Normal';
        var src;
        if (isShinyDeck) {
          // Try shiny video/sprite of the base form or matching mega/variant
          var forms = (poke.megaEvolutions || []).concat(poke.variants || []);
          var matchForm = forms.find(function (f) { return f.name && f.name.toLowerCase() === baseName.toLowerCase(); });
          if (matchForm) {
            src = matchForm.shinyVideo || matchForm.shinySprite || matchForm.video || matchForm.sprite;
          } else {
            src = poke.shinyVideo || poke.shinySprite || poke.video || poke.sprite;
          }
        } else {
          src = resolveFormVideo(poke, deck.version) || resolveFormSprite(poke, deck.version);
        }
        return buildSpriteEl(src, deck.version, 'deck-sprite', 'assets/images/placeholder.png');
      })() +
      '</div>' +
      '<div class="deck-info">' +
      '<div class="deck-header">' +
      '<h3 class="deck-name">' + deck.name + '</h3>' +
      '<span class="deck-game">' +
      '<img src="' + logoPath + '" alt="' + deck.game + '" class="deck-game-logo" onerror="this.style.display=\'none\'">' +
      (deck.game || '') +
      '</span>' +
      '</div>' +
      '<p class="deck-version">' + deck.version + '</p>' +
      '<div class="deck-moves">' + movesList + '</div>' +
      '<div class="deck-strength">' +
      '<div class="deck-strength-header">' +
      '<span class="deck-strength-label">Deck Power</span>' +
      '<span class="deck-strength-value" style="color:' + strengthColor + '">' + totalPower + ' / ' + MAX_DECK_POWER + '</span>' +
      '</div>' +
      '<div class="deck-strength-bar-bg">' +
      '<div class="deck-strength-bar-fill" style="width:' + strengthPct + '%;background:' + strengthColor + '"></div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }).join('');

  return (
    '<section class="detail-section">' +
    '<h2 class="section-title">&#127922; Decks</h2>' +
    '<p class="section-subtitle">' + poke.decks.length + ' deck' + (poke.decks.length > 1 ? 's' : '') + ' available</p>' +
    '<div class="decks-list">' + cards + '</div>' +
    '</section>'
  );
}


// ====================== Pokédex Data Builders ======================
function buildCatchRate(poke) {
  if (poke.catchRate === undefined) return '';
  var rate = poke.catchRate;
  var pct = ((rate / 255) * 100).toFixed(1);
  var color = rate >= 150 ? '#4ade80' : rate >= 75 ? '#facc15' : '#f87171';
  var label = rate >= 150 ? 'Easy' : rate >= 75 ? 'Medium' : 'Hard';
  return (
    '<div class="meta-card pokedex-data-card">' +
    '<h3 class="meta-title">Catch Rate</h3>' +
    '<div class="pokedex-data-row">' +
    '<span class="pokedex-data-value" style="color:' + color + '">' + rate + '</span>' +
    '<span class="pokedex-data-sub">' + label + '</span>' +
    '</div>' +
    '<div class="stat-bar-bg" style="margin-top:0.5rem">' +
    '<div class="stat-bar-fill" style="width:' + pct + '%;background:' + color + '"></div>' +
    '</div>' +
    '</div>'
  );
}

function buildShinyRate(poke) {
  if (!poke.shinyRate) return '';
  return (
    '<div class="meta-card pokedex-data-card">' +
    '<h3 class="meta-title">Shiny Rate</h3>' +
    '<div class="pokedex-data-row">' +
    '<span class="pokedex-data-value" style="color:#facc15">&#10024;</span>' +
    '<span class="pokedex-data-sub">' + poke.shinyRate + '</span>' +
    '</div>' +
    '</div>'
  );
}

function buildEVYield(poke) {
  if (!poke.evYield) return '';
  var statLabels = { hp: 'HP', attack: 'Attack', defense: 'Defense', spAttack: 'Sp. Atk', spDefense: 'Sp. Def', speed: 'Speed' };
  var rows = Object.entries(poke.evYield).map(function (e) {
    return (
      '<div class="ev-row">' +
      '<span class="ev-stat">' + (statLabels[e[0]] || e[0]) + '</span>' +
      '<span class="ev-value">+' + e[1] + '</span>' +
      '</div>'
    );
  }).join('');
  return (
    '<div class="meta-card pokedex-data-card" id="evYieldCard">' +
    '<h3 class="meta-title">EV Yield</h3>' +
    '<div class="ev-list">' + rows + '</div>' +
    '</div>'
  );
}

function buildHeldItems(poke) {
  if (!poke.heldItems || !poke.heldItems.length) return '';
  var rows = poke.heldItems.map(function (item) {
    return (
      '<div class="drop-row">' +
      '<div class="drop-icon">' +
      (item.image
        ? '<img src="' + item.image + '" alt="' + item.item + '" onerror="this.parentElement.innerHTML=\'&#128230;\'">'
        : '&#128230;') +
      '</div>' +
      '<div class="drop-info">' +
      '<p class="drop-name">' + item.item + '</p>' +
      '<p class="drop-meta"><span style="color:#4ade80;font-weight:600">' + item.chance + '%</span> chance</p>' +
      '</div>' +
      '</div>'
    );
  }).join('');
  return (
    '<div class="meta-card pokedex-data-card">' +
    '<h3 class="meta-title">Held Items</h3>' +
    rows +
    '</div>'
  );
}


function loadPokemonDetail() {
  var container = document.getElementById('pokemonDetail');
  if (!container) return;

  var id = parseInt(new URLSearchParams(window.location.search).get('id'));
  var poke = getPokemonById(id);

  if (!poke) {
    container.innerHTML =
      '<div class="error-state">' +
      '<div class="text-5xl mb-4">&#10067;</div>' +
      '<p class="text-xl text-red-400">Pokémon not found</p>' +
      '<a href="index.html" class="back-link mt-4 inline-block">\u2190 Back to Pokédex</a>' +
      '</div>';
    return;
  }

  document.title = poke.name + ' (#' + (poke.number || poke.id) + ') \u2014 Cobblemon Pokédex';

  var statsHTML = buildStatsHTML(poke.baseStats);

  var typeBadgesLg = buildTypeBadges(poke.types, 'type-lg');

  var shinyBtn = (poke.shinySprite || poke.shinyVideo)
    ? '<button id="shinyBtn" onclick="toggleShiny()" class="shiny-btn" title="Toggle shiny form"><span id="shinyLabel">Shiny</span></button>'
    : '';

  var abilitiesHTML = (poke.abilities || []).map(function (a) {
    var cleanName = a.replace(' (Hidden)', '').trim();
    var isHidden = a.indexOf('(Hidden)') !== -1;
    var desc = State.allAbilities[cleanName] ? State.allAbilities[cleanName].description : '';
    return (
      '<div class="meta-tag ability-tag' + (isHidden ? ' ability-hidden' : '') + '"' +
      (desc ? ' data-tooltip="' + desc.replace(/"/g, '&quot;') + '"' : '') + '>' +
      a +
      (desc ? '<div class="ability-tooltip">' + desc + '</div>' : '') +
      '</div>'
    );
  }).join('');

  var weakHTML = buildTypeBadges(poke.weaknesses);
  var resistHTML = buildTypeBadges(poke.resistances);
  var immunityHTML = (poke.immunities || ['None']).map(function (i) {
    return i === 'None'
      ? '<span class="immunity-none">None</span>'
      : buildTypeBadges([i]);
  }).join('');

  var moveTabs = ['Level Up', 'TM', 'Egg', 'Tutor'].map(function (label, i) {
    return (
      '<button class="move-tab ' + (i === 0 ? 'active' : '') + '"' +
      ' role="tab" aria-selected="' + (i === 0) + '"' +
      ' onclick="switchMoveTab(' + i + ')">' + label + '</button>'
    );
  }).join('');

  var megaCount = (poke.megaEvolutions || []).length;

  var megaButtons = '';
  if (megaCount > 0) {
    megaButtons = '<div class="form-btns">' +
      '<button class="form-btn active" onclick="switchForm(0)">' + poke.name + '</button>' +
      poke.megaEvolutions.map(function (mega, i) {
        var name = mega.name || '';
        var variantClass = '';
        if (/mega.*x\b/i.test(name)) variantClass = 'form-btn-mega-x';
        else if (/mega.*y\b/i.test(name)) variantClass = 'form-btn-mega-y';
        else if (/gigantamax|gmax/i.test(name)) variantClass = 'form-btn-gmax';
        else if (/mega/i.test(name)) variantClass = 'form-btn-mega';
        return '<button class="form-btn ' + variantClass + '" onclick="switchForm(' + (i + 1) + ')"><span class="form-btn-label">' + name + '</span></button>';
      }).join('') +
      '</div>';
  }

  // Variants — own button group, own space, indexed after mega evolutions
  var variantButtons = '';
  if (poke.variants && poke.variants.length > 0) {
    variantButtons = '<div class="form-btns variant-btns">' +
      (megaCount === 0 ? '<button class="form-btn active" onclick="switchForm(0)">' + poke.name + '</button>' : '') +
      poke.variants.map(function (variant, i) {
        var name = variant.name || '';
        return '<button class="form-btn form-btn-variant" onclick="switchForm(' + (megaCount + i + 1) + ')"><span class="form-btn-label">' + name + '</span></button>';
      }).join('') +
      '</div>';
  }

  container.innerHTML =
    '<div class="detail-wrapper">' +

    '<div class="detail-hero">' +
    '<div class="sprite-container">' +
    '<div class="sprite-wrap">' +
    buildSpriteEl(poke.video || poke.sprite, poke.name, 'detail-sprite', 'assets/images/placeholder.png') +
    '</div>' +
    shinyBtn +
    megaButtons +
    variantButtons +
    '</div>' +

    '<div class="detail-info">' +
    '<p class="detail-number">#' + (poke.number || String(poke.id).padStart(4, '0')) + '</p>' +
    '<h1 class="detail-name">' + poke.name + '</h1>' +
    '<div class="detail-types" id="pokemonTypes">' + typeBadgesLg + '</div>' +
    '<div class="detail-meta-grid">' +
    '<div class="meta-card">' +
    '<h3 class="meta-title">Abilities</h3>' +
    '<div id="pokemonAbilities">' + abilitiesHTML + '</div>' +
    '</div>' +
    '<div class="meta-card">' +
    '<h3 class="meta-title">Rarity</h3>' +
    '<div class="meta-tag">' + (poke.rarity || '\u2014') + '</div>' +
    '<h3 class="meta-title mt-3">Generation</h3>' +
    '<div class="meta-tag" id="pokemonGeneration">Gen ' + (poke.generation || '?') + '</div>' +
    '</div>' +
    '<div class="meta-card" id="dropsCard">' +
    '<h3 class="meta-title">Dropped Items</h3>' +
    buildDrops(poke.drops) +
    '</div>' +
    buildVariantTrackerCard(poke) +
    '</div>' +
    '</div>' +
    '</div>' +

    '<section class="detail-section">' +
    '<h2 class="section-title">Pokédex Data</h2>' +
    '<div class="pokedex-data-grid">' +
    buildCatchRate(poke) +
    buildShinyRate(poke) +
    buildEVYield(poke) +
    buildHeldItems(poke) +
    '</div>' +
    '</section>' +

    '<section class="detail-section">' +
    '<h2 class="section-title">Base Stats</h2>' +
    '<div class="stats-grid">' + statsHTML + '</div>' +
    '</section>' +

    '<section class="detail-section">' +
    '<h2 class="section-title">Type Effectiveness</h2>' +
    '<div class="effectiveness-grid">' +
    '<div class="effectiveness-card weakness"><h3>Weaknesses</h3><div class="badge-row" id="pokemonWeaknesses">' + weakHTML + '</div></div>' +
    '<div class="effectiveness-card resistance"><h3>Resistances</h3><div class="badge-row" id="pokemonResistances">' + resistHTML + '</div></div>' +
    '<div class="effectiveness-card immunity"><h3>Immunities</h3><div class="badge-row" id="pokemonImmunities">' + immunityHTML + '</div></div>' +
    '</div>' +
    '</section>' +

    buildSpawnSection(poke) +

    buildEvolutionSection(poke) +

    buildRidingSection(poke) +

    '<section class="detail-section">' +
    '<h2 class="section-title">Moves</h2>' +
    '<div class="move-tabs" role="tablist">' + moveTabs + '</div>' +
    '<div class="move-filters">' +
    '<input id="moveSearch" type="text" placeholder="Search name..." class="move-filter-input" oninput="filterMoves()">' +
    '<select id="moveCategoryFilter" class="move-filter-select" onchange="filterMoves()">' +
    '<option value="">All Categories</option>' +
    '<option value="Physical">Physical</option>' +
    '<option value="Special">Special</option>' +
    '<option value="Status">Status</option>' +
    '</select>' +
    '<select id="movePowerFilter" class="move-filter-select" onchange="filterMoves()">' +
    '<option value="">Any Power</option>' +
    '<option value="0-40">0 – 40</option>' +
    '<option value="41-80">41 – 80</option>' +
    '<option value="81-120">81 – 120</option>' +
    '<option value="121-999">121+</option>' +
    '<option value="status">Status (no power)</option>' +
    '</select>' +
    '</div>' +
    '<div id="movesContent" class="moves-content"></div>' +
    '</section>' +

    buildDecksSection(poke) +

    '</div>';

  window._shinyData = { poke: poke, isShiny: false, formIndex: 0, activeMoves: poke.moves };

  // Track recently viewed
  try {
    var history = JSON.parse(localStorage.getItem('recentPokemon') || '[]');
    history = history.filter(function (id) { return id !== poke.id; });
    history.unshift(poke.id);
    localStorage.setItem('recentPokemon', JSON.stringify(history.slice(0, 5)));
  } catch (e) { }

  animateStatBars(container);
  // Scroll-reveal for each section
  container.querySelectorAll('.detail-section').forEach(function (sec, i) {
    sec.classList.add('scroll-reveal');
    sec.style.transitionDelay = (i * 0.07) + 's';
  });
  observeNewRevealTargets(container);
  staggerBiomeTags(container);
  renderMoves(poke);
}

window.switchForm = function (index) {
  var d = window._shinyData;
  if (!d) return;
  d.formIndex = index;
  d.isShiny = false;

  var isNormal = index === 0;
  var megas = d.poke.megaEvolutions || [];
  var variants = d.poke.variants || [];
  var allForms = megas.concat(variants);

  var form = isNormal
    ? {
      name: d.poke.name,
      sprite: d.poke.sprite,
      shinySprite: d.poke.shinySprite,
      shinyVideo: d.poke.shinyVideo,
      video: d.poke.video,
      abilities: d.poke.abilities,
      types: d.poke.types,
      weaknesses: d.poke.weaknesses,
      resistances: d.poke.resistances,
      immunities: d.poke.immunities,
    }
    : allForms[index - 1];

  // Sprite — swap video or image
  var spriteWrap = document.querySelector('.sprite-wrap');
  if (spriteWrap) {
    var newSrc = resolveFormVideo(d.poke, isNormal ? 'Normal' : form.name) || form.video || form.sprite;
    var existing = spriteWrap.querySelector('video, img');
    if (existing) existing.remove();
    spriteWrap.insertAdjacentHTML('afterbegin', buildSpriteEl(newSrc, form.name || d.poke.name, 'detail-sprite', 'assets/images/placeholder.png'));
  }

  // Update stats if this form has its own baseStats
  var statsGrid = document.querySelector('.stats-grid');
  var statsSource = (form.baseStats && Object.keys(form.baseStats).length) ? form.baseStats : d.poke.baseStats;
  if (statsGrid && statsSource) {
    statsGrid.innerHTML = buildStatsHTML(statsSource);
    animateStatBars(statsGrid.closest('.detail-section') || statsGrid);
  }

  // Update page title + detail-name heading
  var displayName = form.name || d.poke.name;
  var nameEl = document.querySelector('.detail-name');
  if (nameEl) nameEl.textContent = displayName;
  document.title = displayName + ' (#' + (d.poke.number || d.poke.id) + ') — Cobblemon Pokédex';

  // Shiny button — show if any shiny asset exists for this form
  var hasShiny = !!(form.shinySprite || form.shinyVideo);
  var btn = document.getElementById('shinyBtn');
  var label = document.getElementById('shinyLabel');
  if (btn) { btn.classList.remove('active'); btn.style.display = hasShiny ? '' : 'none'; }
  if (label) label.textContent = 'Shiny';

  // Moves — use this form's own moves if defined, otherwise fall back to base Pokémon's moves
  d.activeMoves = (form.moves && Object.keys(form.moves).length) ? form.moves : d.poke.moves;
  renderMoves({ moves: d.activeMoves });

  // EV Yield — use this form's own evYield if defined, otherwise fall back to base Pokémon's
  var activeEvYield = (form.evYield && Object.keys(form.evYield).length) ? form.evYield : d.poke.evYield;
  var evCard = document.getElementById('evYieldCard');
  var evCardHTML = buildEVYield({ evYield: activeEvYield });
  if (evCard) {
    if (evCardHTML) {
      evCard.outerHTML = evCardHTML;
    } else {
      evCard.remove();
    }
  } else if (evCardHTML) {
    // No card existed (base form had no EVs) but this form does — insert it into the grid
    var dataGrid = document.querySelector('.pokedex-data-grid');
    if (dataGrid) dataGrid.insertAdjacentHTML('beforeend', evCardHTML);
  }

  // Generation — use this form's own generation if defined, otherwise fall back to base Pokémon's
  var genEl = document.getElementById('pokemonGeneration');
  if (genEl) {
    var activeGen = (form.generation !== undefined && form.generation !== null) ? form.generation : d.poke.generation;
    genEl.textContent = 'Gen ' + (activeGen || '?');
  }

  // Dropped Items — use this form's own drops if defined, otherwise fall back to base Pokémon's
  var activeDrops = (form.drops && form.drops.length) ? form.drops : d.poke.drops;
  var dropsCard = document.getElementById('dropsCard');
  if (dropsCard) {
    dropsCard.innerHTML = '<h3 class="meta-title">Dropped Items</h3>' + buildDrops(activeDrops);
  }

  // Abilities
  var abilitiesEl = document.getElementById('pokemonAbilities');
  if (abilitiesEl && form.abilities) {
    abilitiesEl.innerHTML = form.abilities.map(function (a) {
      var cleanName = a.replace(' (Hidden)', '').trim();
      var isHidden = a.indexOf('(Hidden)') !== -1;
      var desc = State.allAbilities[cleanName] ? State.allAbilities[cleanName].description : '';
      return (
        '<div class="meta-tag ability-tag' + (isHidden ? ' ability-hidden' : '') + '"' +
        (desc ? ' data-tooltip="' + desc.replace(/"/g, '&quot;') + '"' : '') + '>' +
        a +
        (desc ? '<div class="ability-tooltip">' + desc + '</div>' : '') +
        '</div>'
      );
    }).join('');
  }

  // Types
  var typesEl = document.getElementById('pokemonTypes');
  if (typesEl && form.types) {
    typesEl.innerHTML = buildTypeBadges(form.types, 'type-lg');
  }

  // Weaknesses
  var weakEl = document.getElementById('pokemonWeaknesses');
  if (weakEl && form.weaknesses) {
    weakEl.innerHTML = buildTypeBadges(form.weaknesses);
  }

  // Resistances
  var resistEl = document.getElementById('pokemonResistances');
  if (resistEl && form.resistances) {
    resistEl.innerHTML = buildTypeBadges(form.resistances);
  }

  // Immunities
  var immunEl = document.getElementById('pokemonImmunities');
  if (immunEl && form.immunities) {
    immunEl.innerHTML = (form.immunities).map(function (i) {
      return i === 'None'
        ? '<span class="immunity-none">None</span>'
        : buildTypeBadges([i]);
    }).join('');
  }

  // Active form tab — handle separate mega/variant button groups
  var megaGroup = document.querySelector('.form-btns:not(.variant-btns)');
  var variantGroup = document.querySelector('.form-btns.variant-btns');

  if (megaGroup) {
    var megaBtns = megaGroup.querySelectorAll('.form-btn');
    megaBtns.forEach(function (b, i) {
      b.classList.toggle('active', i === index);
    });
  }

  if (variantGroup) {
    var variantBtns = variantGroup.querySelectorAll('.form-btn');
    var hasOwnNormal = variantBtns.length === (d.poke.variants || []).length + 1;
    variantBtns.forEach(function (b, i) {
      var formIdx = hasOwnNormal ? i : i + 1 + megas.length;
      // If variant group has its own Normal button (i===0 maps to index 0),
      // otherwise variant buttons start at megas.length + 1
      var matchIndex = hasOwnNormal
        ? (i === 0 ? 0 : megas.length + i)
        : megas.length + 1 + i;
      b.classList.toggle('active', matchIndex === index);
    });
  }
};


// ====================== Moves ======================
function renderMoves(poke, filtered) {
  var content = document.getElementById('movesContent');
  if (!content) return;

  var keys = ['level', 'tm', 'egg', 'tutor'];
  var moves = filtered !== undefined ? filtered : ((poke.moves || {})[keys[State.currentMoveTab]] || []).map(enrichMove);

  if (moves.length === 0) {
    content.innerHTML = '<p class="moves-empty">No moves match your search.</p>';
    return;
  }

  if (State.currentMoveTab !== 0) {
    moves = moves.slice().sort(function (a, b) { return (parseInt(b.power) || 0) - (parseInt(a.power) || 0); });
  }

  var categoryColors = { Physical: '#f87171', Special: '#818cf8', Status: '#4ade80' };
  var isLevelTab = State.currentMoveTab === 0;

  var rows = moves.map(function (m) {
    var typeCell = m.type
      ? '<span class="type-badge type-' + m.type.toLowerCase() + ' type-xs"><img src="assets/images/elements/' + m.type.toLowerCase() + '.png" class="type-icon" alt="" onerror="this.style.display=\'none\'">' + m.type + '</span>'
      : '\u2014';
    var catColor = categoryColors[m.category] || '#9ca3af';
    var catCell = m.category
      ? '<span class="move-category-badge" style="background:' + catColor + '20;border-color:' + catColor + ';color:' + catColor + '">' + m.category + '</span>'
      : '\u2014';
    return (
      '<tr>' +
      (isLevelTab ? '<td class="move-level">' + (m.level || '\u2014') + '</td>' : '') +
      '<td class="move-name"><a href="move.html?name=' + encodeURIComponent(m.name) + '" class="move-link">' + m.name + '</a></td>' +
      '<td>' + typeCell + '</td>' +
      '<td>' + catCell + '</td>' +
      '<td class="text-center move-power">' + (m.power || '\u2014') + '</td>' +
      '<td class="text-center">' + (m.accuracy || '\u2014') + '</td>' +
      '<td class="text-center">' + (m.pp || '\u2014') + '</td>' +
      '</tr>'
    );
  }).join('');

  content.innerHTML =
    '<div class="table-wrapper">' +
    '<table class="moves-table">' +
    '<thead><tr>' +
    (isLevelTab ? '<th>Lv.</th>' : '') +
    '<th>Move</th><th>Type</th><th>Cat.</th>' +
    '<th class="text-center">Pwr</th><th class="text-center">Acc</th><th class="text-center">PP</th>' +
    '</tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
    '</table>' +
    '</div>';
}

window.filterMoves = function () {
  var id = parseInt(new URLSearchParams(window.location.search).get('id'));
  var poke = getPokemonById(id);
  if (!poke) return;

  var search = (document.getElementById('moveSearch') ? document.getElementById('moveSearch').value.toLowerCase().trim() : '');
  var category = (document.getElementById('moveCategoryFilter') ? document.getElementById('moveCategoryFilter').value : '');
  var power = (document.getElementById('movePowerFilter') ? document.getElementById('movePowerFilter').value : '');

  // Use the active form's moves if a form is selected (mega/variant may have different moves)
  var activeMoves = (window._shinyData && window._shinyData.activeMoves) ? window._shinyData.activeMoves : poke.moves;

  var keys = ['level', 'tm', 'egg', 'tutor'];
  var moves = ((activeMoves || {})[keys[State.currentMoveTab]] || []).map(enrichMove);

  var filtered = moves.filter(function (m) {
    var matchName = !search || m.name.toLowerCase().includes(search);
    var matchCat = !category || m.category === category;
    var matchPow = true;
    if (power === 'status') {
      matchPow = !m.power || m.power === '-';
    } else if (power) {
      var parts = power.split('-');
      var min = parseInt(parts[0]);
      var max = parseInt(parts[1]);
      var p = parseInt(m.power) || 0;
      matchPow = p >= min && p <= max;
    }
    return matchName && matchCat && matchPow;
  });

  renderMoves(poke, filtered);
};

window.switchMoveTab = function (index) {
  State.currentMoveTab = index;
  document.querySelectorAll('.move-tab').forEach(function (btn, i) {
    var active = i === index;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active);
  });
  // Reset filters on tab switch
  var s = document.getElementById('moveSearch');
  var c = document.getElementById('moveCategoryFilter');
  var p = document.getElementById('movePowerFilter');
  if (s) s.value = '';
  if (c) c.value = '';
  if (p) p.value = '';
  var id = parseInt(new URLSearchParams(window.location.search).get('id'));
  var poke = getPokemonById(id);
  var activeMoves = (window._shinyData && window._shinyData.activeMoves) ? window._shinyData.activeMoves : (poke ? poke.moves : null);
  if (poke) renderMoves({ moves: activeMoves });
};

window.toggleShiny = function () {
  var d = window._shinyData;
  if (!d || !d.poke) return;

  var allForms = (d.poke.megaEvolutions || []).concat(d.poke.variants || []);
  var form = d.formIndex === 0
    ? { sprite: d.poke.sprite, shinySprite: d.poke.shinySprite, shinyVideo: d.poke.shinyVideo }
    : allForms[d.formIndex - 1];

  if (!form.shinySprite && !form.shinyVideo) { return; }
  d.isShiny = !d.isShiny;

  var src = d.isShiny
    ? (form.shinyVideo || form.shinySprite)
    : (resolveFormVideo(d.poke, form.name || 'Normal') || form.sprite);

  var spriteWrap = document.querySelector('.sprite-wrap');
  if (spriteWrap) {
    var existing = spriteWrap.querySelector('video, img');
    if (existing) existing.remove();
    spriteWrap.insertAdjacentHTML('afterbegin', buildSpriteEl(src, d.poke.name, 'detail-sprite', 'assets/images/placeholder.png'));
  }

  var btn = document.getElementById('shinyBtn');
  var label = document.getElementById('shinyLabel');
  if (btn) btn.classList.toggle('active', d.isShiny);
  if (label) label.textContent = d.isShiny ? 'NORMAL' : 'SHINY';
};


// ====================== Move Detail Page ======================
function loadMoveDetail() {
  var container = document.getElementById('moveDetail');
  if (!container) return;

  var params = new URLSearchParams(window.location.search);
  var moveName = decodeURIComponent(params.get('name') || '');
  // Use browser history for back navigation - reliable regardless of where user came from
  var backLink = document.getElementById('backLink');
  if (backLink) {
    backLink.href = '#';
    backLink.onclick = function (e) {
      e.preventDefault();
      if (history.length > 1) {
        history.back();
      } else {
        location.href = 'index.html';
      }
    };
  }

  var move = State.allMoves[moveName];
  if (!move) {
    container.innerHTML = '<div class="error-state"><div class="text-4xl mb-3">❓</div><p class="text-red-400 text-lg">Move not found: ' + moveName + '</p></div>';
    return;
  }

  document.title = moveName + ' — Cobblemon Pokédex';

  // Find all pokemon that learn this move
  var learnedBy = { level: [], tm: [], egg: [], tutor: [] };
  State.allPokemon.forEach(function (poke) {
    if (!poke.moves) return;
    ['level', 'tm', 'egg', 'tutor'].forEach(function (method) {
      var found = (poke.moves[method] || []).find(function (m) { return m.name === moveName; });
      if (found) learnedBy[method].push({ poke: poke, level: found.level });
    });
  });

  var categoryColors = { Physical: '#f87171', Special: '#818cf8', Status: '#4ade80' };
  var catColor = categoryColors[move.category] || '#9ca3af';

  var statBlocks = [
    { label: 'Power', value: move.power || '—' },
    { label: 'Accuracy', value: move.accuracy ? move.accuracy + '%' : '—' },
    { label: 'PP', value: move.pp || '—' },
  ].map(function (s) {
    return (
      '<div class="move-stat-block">' +
      '<p class="move-stat-value">' + s.value + '</p>' +
      '<p class="move-stat-label">' + s.label + '</p>' +
      '</div>'
    );
  }).join('');

  var moveTabs = ['Level Up', 'TM', 'Egg', 'Tutor'].map(function (label, i) {
    var key = ['level', 'tm', 'egg', 'tutor'][i];
    var count = learnedBy[key].length;
    return (
      '<button class="move-tab ' + (i === 0 ? 'active' : '') + '"' +
      ' onclick="switchMoveLearnerTab(' + i + ')">' +
      label + ' <span class="move-tab-count">' + count + '</span>' +
      '</button>'
    );
  }).join('');

  container.innerHTML =
    '<div class="detail-wrapper">' +

    '<section class="detail-section move-hero">' +
    '<div class="move-hero-top">' +
    '<div>' +
    '<h1 class="move-hero-name">' + moveName + '</h1>' +
    '<div class="move-hero-badges">' +
    '<span class="type-badge type-' + (move.type || 'normal').toLowerCase() + ' type-lg"><img src="assets/images/elements/' + (move.type || 'normal').toLowerCase() + '.png" class="type-icon" alt="" onerror="this.style.display=\'none\'">' + (move.type || '—') + '</span>' +
    '<span class="move-category-badge" style="background:' + catColor + '20;border-color:' + catColor + ';color:' + catColor + '">' + (move.category || '—') + '</span>' +
    '</div>' +
    '</div>' +
    '<div class="move-stat-blocks">' + statBlocks + '</div>' +
    '</div>' +
    (move.description
      ? '<p class="move-description">' + move.description + '</p>'
      : '') +
    '</section>' +

    '<section class="detail-section">' +
    '<h2 class="section-title">Learned By</h2>' +
    '<div class="move-tabs" role="tablist">' + moveTabs + '</div>' +
    '<div id="moveLearnerContent" class="moves-content"></div>' +
    '</section>' +

    '</div>';

  window._moveLearnerData = learnedBy;
  window._currentMoveLearnerTab = 0;
  renderMoveLearners();
  container.querySelectorAll('.detail-section').forEach(function (sec, i) {
    sec.classList.add('scroll-reveal');
    sec.style.transitionDelay = (i * 0.07) + 's';
  });
  observeNewRevealTargets(container);
}

function renderMoveLearners() {
  var content = document.getElementById('moveLearnerContent');
  if (!content) return;

  var keys = ['level', 'tm', 'egg', 'tutor'];
  var entries = window._moveLearnerData[keys[window._currentMoveLearnerTab]] || [];

  if (entries.length === 0) {
    content.innerHTML = '<p class="moves-empty">No Pokémon learn this move via this method.</p>';
    return;
  }

  var isLevel = window._currentMoveLearnerTab === 0;

  var rows = entries.map(function (entry) {
    var poke = entry.poke;
    var sprite = poke.video || poke.sprite;
    var num = poke.number || String(poke.id).padStart(4, '0');
    var types = (poke.types || []).map(function (t) {
      return '<span class="type-badge type-' + t.toLowerCase() + ' type-xs">' + t + '</span>';
    }).join('');

    return (
      '<tr class="learner-row" onclick="location.href=\'pokemon.html?id=' + poke.id + '\'" style="cursor:pointer">' +
      (isLevel ? '<td class="move-level">' + (entry.level || '—') + '</td>' : '') +
      '<td>' +
      '<div class="learner-sprite-wrap">' +
      buildSpriteEl(sprite, poke.name, 'learner-sprite') +
      '</div>' +
      '</td>' +
      '<td class="move-name"><a href="pokemon.html?id=' + poke.id + '" class="move-link">#' + num + ' ' + poke.name + '</a></td>' +
      '<td><div class="badge-row">' + types + '</div></td>' +
      '</tr>'
    );
  }).join('');

  content.innerHTML =
    '<div class="table-wrapper">' +
    '<table class="moves-table">' +
    '<thead><tr>' +
    (isLevel ? '<th>Lv.</th>' : '') +
    '<th></th>' +
    '<th>Pokémon</th>' +
    '<th>Type</th>' +
    '</tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
    '</table>' +
    '</div>';

  staggerMoveRows(content);
  setTimeout(playAllVideos, 100);
}

window.switchMoveLearnerTab = function (index) {
  window._currentMoveLearnerTab = index;
  document.querySelectorAll('.move-tab').forEach(function (btn, i) {
    btn.classList.toggle('active', i === index);
    btn.setAttribute('aria-selected', i === index);
  });
  renderMoveLearners();
};


// ====================== Move Dex Page ======================
function loadMoveDexPage() {
  var typeSelect = document.getElementById('mdTypeFilter');
  if (typeSelect) {
    var typesInUse = [...new Set(Object.values(State.allMoves).map(function (m) { return m.type; }).filter(Boolean))].sort();
    typesInUse.forEach(function (t) {
      var opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      typeSelect.appendChild(opt);
    });
  }

  ['mdSearch', 'mdTypeFilter', 'mdCategoryFilter', 'mdSort'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    var evt = (id === 'mdSearch') ? 'input' : 'change';
    var handler = filterMoveDex;
    if (id === 'mdSearch') {
      var _mdDebounce;
      handler = function () {
        clearTimeout(_mdDebounce);
        _mdDebounce = setTimeout(filterMoveDex, 160);
      };
    }
    el.addEventListener(evt, handler, { passive: true });
  });

  filterMoveDex();
}

window.filterMoveDex = function () {
  var search = (document.getElementById('mdSearch') ? document.getElementById('mdSearch').value.toLowerCase().trim() : '');
  var typeVal = (document.getElementById('mdTypeFilter') ? document.getElementById('mdTypeFilter').value : '');
  var catVal = (document.getElementById('mdCategoryFilter') ? document.getElementById('mdCategoryFilter').value : '');
  var sortVal = (document.getElementById('mdSort') ? document.getElementById('mdSort').value : 'name');

  var list = Object.keys(State.allMoves).map(function (name) {
    var m = State.allMoves[name];
    return {
      name: name,
      type: m.type || '',
      category: m.category || '',
      power: m.power,
      accuracy: m.accuracy,
      pp: m.pp,
    };
  });

  if (search) {
    list = list.filter(function (m) { return m.name.toLowerCase().indexOf(search) !== -1; });
  }
  if (typeVal) {
    list = list.filter(function (m) { return m.type === typeVal; });
  }
  if (catVal) {
    list = list.filter(function (m) { return m.category === catVal; });
  }

  list.sort(function (a, b) {
    if (sortVal === 'power') return (parseInt(b.power) || 0) - (parseInt(a.power) || 0);
    if (sortVal === 'accuracy') return (parseInt(b.accuracy) || 0) - (parseInt(a.accuracy) || 0);
    if (sortVal === 'pp') return (parseInt(b.pp) || 0) - (parseInt(a.pp) || 0);
    return a.name.localeCompare(b.name);
  });

  renderMoveDexTable(list);

  var countEl = document.getElementById('mdCount');
  if (countEl) {
    var total = Object.keys(State.allMoves).length;
    countEl.textContent = 'Showing ' + list.length + ' of ' + total + ' moves';
  }
};

function renderMoveDexTable(moves) {
  var wrap = document.getElementById('mdTableWrap');
  if (!wrap) return;

  if (moves.length === 0) {
    wrap.innerHTML = '<p class="moves-empty">No moves match your search.</p>';
    return;
  }

  var categoryColors = { Physical: '#f87171', Special: '#818cf8', Status: '#4ade80' };

  var rows = moves.map(function (m) {
    var typeCell = m.type
      ? '<span class="type-badge type-' + m.type.toLowerCase() + ' type-xs"><img src="assets/images/elements/' + m.type.toLowerCase() + '.png" class="type-icon" alt="" onerror="this.style.display=\'none\'">' + m.type + '</span>'
      : '\u2014';
    var catColor = categoryColors[m.category] || '#9ca3af';
    var catCell = m.category
      ? '<span class="move-category-badge" style="background:' + catColor + '20;border-color:' + catColor + ';color:' + catColor + '">' + m.category + '</span>'
      : '\u2014';
    return (
      '<tr>' +
      '<td class="move-name"><a href="move.html?name=' + encodeURIComponent(m.name) + '" class="move-link">' + m.name + '</a></td>' +
      '<td>' + typeCell + '</td>' +
      '<td>' + catCell + '</td>' +
      '<td class="text-center move-power">' + (m.power || '\u2014') + '</td>' +
      '<td class="text-center">' + (m.accuracy || '\u2014') + '</td>' +
      '<td class="text-center">' + (m.pp || '\u2014') + '</td>' +
      '</tr>'
    );
  }).join('');

  wrap.innerHTML =
    '<div class="table-wrapper">' +
    '<table class="moves-table">' +
    '<thead><tr>' +
    '<th>Move</th><th>Type</th><th>Cat.</th>' +
    '<th class="text-center">Pwr</th><th class="text-center">Acc</th><th class="text-center">PP</th>' +
    '</tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
    '</table>' +
    '</div>';
}


// ====================== Ability Detail Page ======================
function loadAbilityDetail() {
  var container = document.getElementById('abilityDetail');
  if (!container) return;

  var params = new URLSearchParams(window.location.search);
  var abilityName = decodeURIComponent(params.get('name') || '');

  var backLink = document.getElementById('backLink');
  if (backLink) {
    backLink.href = '#';
    backLink.onclick = function (e) {
      e.preventDefault();
      if (history.length > 1) { history.back(); } else { location.href = 'index.html'; }
    };
  }

  var ability = State.allAbilities[abilityName];

  document.title = abilityName + ' — Cobblemon Pokédex';

  var regular = [];
  var hidden = [];

  State.allPokemon.forEach(function (poke) {
    (poke.abilities || []).forEach(function (a) {
      var isHidden = a.indexOf('(Hidden)') !== -1;
      var cleanName = a.replace(' (Hidden)', '').trim();
      if (cleanName === abilityName) {
        if (isHidden) hidden.push(poke);
        else regular.push(poke);
      }
    });
  });

  var tabs = [
    { label: 'Regular', list: regular },
    { label: 'Hidden', list: hidden },
  ];

  var moveTabs = tabs.map(function (t, i) {
    return (
      '<button class="move-tab ' + (i === 0 ? 'active' : '') + '"' +
      ' onclick="switchAbilityTab(' + i + ')">' +
      t.label + ' <span class="move-tab-count">' + t.list.length + '</span>' +
      '</button>'
    );
  }).join('');

  container.innerHTML =
    '<div class="detail-wrapper">' +
    '<section class="detail-section move-hero">' +
    '<div class="move-hero-top">' +
    '<h1 class="move-hero-name">' + abilityName + '</h1>' +
    '</div>' +
    (ability && ability.description
      ? '<p class="move-description">' + ability.description + '</p>'
      : '<p class="move-description" style="color:var(--text-dim);font-style:italic">No description available yet.</p>') +
    '</section>' +
    '<section class="detail-section">' +
    '<h2 class="section-title">Pok\u00e9mon with this Ability</h2>' +
    '<div class="move-tabs" role="tablist">' + moveTabs + '</div>' +
    '<div id="abilityPokemonContent" class="moves-content"></div>' +
    '</section>' +
    '</div>';

  window._abilityTabData = tabs;
  window._currentAbilityTab = 0;
  renderAbilityPokemon();
}

function renderAbilityPokemon() {
  var content = document.getElementById('abilityPokemonContent');
  if (!content) return;

  var list = (window._abilityTabData[window._currentAbilityTab] || {}).list || [];

  if (list.length === 0) {
    content.innerHTML = '<p class="moves-empty">No Pok\u00e9mon have this ability via this method.</p>';
    return;
  }

  var rows = list.map(function (poke) {
    var sprite = poke.video || poke.sprite;
    var num = poke.number || String(poke.id).padStart(4, '0');
    var types = (poke.types || []).map(function (t) {
      return '<span class="type-badge type-' + t.toLowerCase() + ' type-xs">' + t + '</span>';
    }).join('');
    return (
      '<tr class="learner-row" onclick="location.href=\'pokemon.html?id=' + poke.id + '\'" style="cursor:pointer">' +
      '<td><div class="learner-sprite-wrap">' + buildSpriteEl(sprite, poke.name, 'learner-sprite') + '</div></td>' +
      '<td class="move-name"><a href="pokemon.html?id=' + poke.id + '" class="move-link">#' + num + ' ' + poke.name + '</a></td>' +
      '<td><div class="badge-row">' + types + '</div></td>' +
      '</tr>'
    );
  }).join('');

  content.innerHTML =
    '<div class="table-wrapper">' +
    '<table class="moves-table">' +
    '<thead><tr><th></th><th>Pok\u00e9mon</th><th>Type</th></tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
    '</table>' +
    '</div>';

  setTimeout(playAllVideos, 100);
}

window.switchAbilityTab = function (index) {
  window._currentAbilityTab = index;
  document.querySelectorAll('.move-tab').forEach(function (btn, i) {
    btn.classList.toggle('active', i === index);
  });
  renderAbilityPokemon();
};


function showLoadingState() {
  var grid = document.getElementById('pokemonGrid');
  var detail = document.getElementById('pokemonDetail');
  if (grid) {
    grid.innerHTML = Array(12).fill(0).map(function () {
      return '<div class="pokemon-card skeleton"></div>';
    }).join('');
  }
  if (detail) {
    detail.innerHTML = '<div class="detail-loading"><div class="spinner"></div><p>Loading Pokémon data\u2026</p></div>';
  }
}

function hideLoadingState() { }

function showDataError() {
  var grid = document.getElementById('pokemonGrid');
  var detail = document.getElementById('pokemonDetail');
  var msg =
    '<div class="error-state col-span-full">' +
    '<div class="text-4xl mb-3">&#9888;&#65039;</div>' +
    '<p class="text-red-400 text-lg">Failed to load Pokémon data</p>' +
    '<p class="text-gray-500 text-sm mt-1">Check that <code>data/pokemon.json</code> and <code>data/moves.json</code> exist.</p>' +
    '</div>';
  if (grid) grid.innerHTML = msg;
  if (detail) detail.innerHTML = msg;
}




// ====================== Settings Panel ======================

var SETTINGS_KEY = 'cobblemon_settings';

var defaultSettings = {
  theme: 'dark',
  animations: true,
  compact: false,
  fontSize: 1,   // 0=sm, 1=md, 2=lg, 3=xl
};

var currentSettings = Object.assign({}, defaultSettings);

var fontSizeClasses = ['font-sm', 'font-md', 'font-lg', 'font-xl'];
var fontSizeLabels = ['13px', '15px', '17px', '19px'];
var themes = ['dark', 'light', 'forest', 'midnight'];

function loadSettings() {
  try {
    var saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    currentSettings = Object.assign({}, defaultSettings, saved);
  } catch (e) { }
  applySettings(false);
}

function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings)); } catch (e) { }
}

function applySettings(animate) {
  var body = document.body;

  // Theme
  themes.forEach(function (t) { body.classList.remove('theme-' + t); });
  if (currentSettings.theme !== 'dark') {
    body.classList.add('theme-' + currentSettings.theme);
  }

  // Animations
  body.classList.toggle('no-animations', !currentSettings.animations);

  // Compact
  body.classList.toggle('compact', !!currentSettings.compact);

  // Font size — applied to <html> so rem units cascade from :root
  var html = document.documentElement;
  fontSizeClasses.forEach(function (c) { body.classList.remove(c); html.classList.remove(c); });
  html.classList.add(fontSizeClasses[currentSettings.fontSize] || 'font-md');
  body.classList.add(fontSizeClasses[currentSettings.fontSize] || 'font-md');

  // Sync panel UI if it exists
  syncSettingsUI();
}

function syncSettingsUI() {
  // Theme swatches
  document.querySelectorAll('.theme-swatch').forEach(function (sw) {
    sw.classList.toggle('active', sw.dataset.theme === currentSettings.theme);
  });

  // Toggles
  var animToggle = document.getElementById('settingAnimations');
  var compactToggle = document.getElementById('settingCompact');
  if (animToggle) animToggle.checked = currentSettings.animations;
  if (compactToggle) compactToggle.checked = currentSettings.compact;

  // Font size slider
  var slider = document.getElementById('settingFontSize');
  var sizeLabel = document.getElementById('fontSizeLabel');
  if (slider) slider.value = currentSettings.fontSize;
  if (sizeLabel) sizeLabel.textContent = fontSizeLabels[currentSettings.fontSize] || '15px';
}

function buildSettingsPanel() {
  // Backdrop
  var backdrop = document.createElement('div');
  backdrop.className = 'settings-backdrop';
  backdrop.id = 'settingsBackdrop';
  backdrop.addEventListener('click', closeSettings);
  document.body.appendChild(backdrop);

  // Button
  var btn = document.createElement('button');
  btn.className = 'settings-btn';
  btn.id = 'settingsBtn';
  btn.title = 'Settings';
  btn.innerHTML = '⚙️';
  btn.setAttribute('aria-label', 'Open settings');
  btn.addEventListener('click', toggleSettings);
  document.body.appendChild(btn);

  // Panel
  var panel = document.createElement('div');
  panel.className = 'settings-panel';
  panel.id = 'settingsPanel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Settings');
  panel.innerHTML =
    '<div class="settings-panel-title">⚙️ &nbsp;Settings</div>' +

    '<div class="setting-row">' +
    '<span class="setting-label">Theme</span>' +
    '<div class="theme-swatches">' +
    '<button class="theme-swatch" data-theme="dark"     onclick="setTheme(\'dark\')"    ><span class="theme-dot dot-dark"></span>Dark</button>' +
    '<button class="theme-swatch" data-theme="light"    onclick="setTheme(\'light\')"   ><span class="theme-dot dot-light"></span>Light</button>' +
    '<button class="theme-swatch" data-theme="forest"   onclick="setTheme(\'forest\')"  ><span class="theme-dot dot-forest"></span>Forest</button>' +
    '<button class="theme-swatch" data-theme="midnight" onclick="setTheme(\'midnight\')"><span class="theme-dot dot-midnight"></span>Midnight</button>' +
    '</div>' +
    '</div>' +

    '<div class="settings-divider"></div>' +

    '<div class="setting-row">' +
    '<div class="setting-toggle-row">' +
    '<span class="setting-toggle-label">Animations</span>' +
    '<label class="toggle-switch">' +
    '<input type="checkbox" id="settingAnimations" onchange="setSetting(\'animations\', this.checked)">' +
    '<span class="toggle-track"></span>' +
    '</label>' +
    '</div>' +
    '</div>' +

    '<div class="setting-row">' +
    '<div class="setting-toggle-row">' +
    '<span class="setting-toggle-label">Compact cards</span>' +
    '<label class="toggle-switch">' +
    '<input type="checkbox" id="settingCompact" onchange="setSetting(\'compact\', this.checked)">' +
    '<span class="toggle-track"></span>' +
    '</label>' +
    '</div>' +
    '</div>' +

    '<div class="setting-row">' +
    '<span class="setting-label">Font Size</span>' +
    '<div class="font-slider-row">' +
    '<span style="font-size:0.7rem;color:var(--text-dim)">A</span>' +
    '<input type="range" class="font-slider" id="settingFontSize" min="0" max="3" step="1" oninput="setSetting(\'fontSize\', +this.value)">' +
    '<span style="font-size:0.88rem;color:var(--text-dim)">A</span>' +
    '<span class="font-size-label" id="fontSizeLabel">15px</span>' +
    '</div>' +
    '</div>' +

    '<div class="settings-divider"></div>' +

    '<button class="settings-reset" onclick="resetSettings()">↺ Reset to defaults</button>';

  document.body.appendChild(panel);
  syncSettingsUI();
}

function toggleSettings() {
  var panel = document.getElementById('settingsPanel');
  var btn = document.getElementById('settingsBtn');
  var backdrop = document.getElementById('settingsBackdrop');
  if (!panel) return;
  var isOpen = panel.classList.contains('open');
  if (isOpen) {
    closeSettings();
  } else {
    panel.classList.add('open');
    btn.classList.add('open');
    backdrop.classList.add('open');
  }
}

function closeSettings() {
  var panel = document.getElementById('settingsPanel');
  var btn = document.getElementById('settingsBtn');
  var backdrop = document.getElementById('settingsBackdrop');
  if (panel) panel.classList.remove('open');
  if (btn) btn.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
}

window.setTheme = function (theme) {
  currentSettings.theme = theme;
  saveSettings();
  applySettings(true);
};

window.setSetting = function (key, value) {
  currentSettings[key] = value;
  saveSettings();
  applySettings(true);
};

window.resetSettings = function () {
  currentSettings = Object.assign({}, defaultSettings);
  saveSettings();
  applySettings(true);
};

// Close on Escape
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeSettings();
});

// ====================== Animation Engine ======================

// Shared IntersectionObserver for scroll-reveal — single instance for whole page
var _revealObserver = null;
function getRevealObserver() {
  if (!_revealObserver && 'IntersectionObserver' in window) {
    _revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          _revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -32px 0px' });
  }
  return _revealObserver;
}

function initScrollReveal() {
  var io = getRevealObserver();
  if (!io) {
    document.querySelectorAll('.scroll-reveal').forEach(function (el) { el.classList.add('revealed'); });
    return;
  }
  document.querySelectorAll('.scroll-reveal').forEach(function (el) { io.observe(el); });
}

function observeNewRevealTargets(container) {
  var io = getRevealObserver();
  if (!io) {
    (container || document).querySelectorAll('.scroll-reveal').forEach(function (el) { el.classList.add('revealed'); });
    return;
  }
  (container || document).querySelectorAll('.scroll-reveal:not(.revealed)').forEach(function (el) { io.observe(el); });
}

function staggerGridCards() {
  // Only animate cards in the first 2 rows (visible viewport) — rest appear instantly
  var cards = document.querySelectorAll('#pokemonGrid .pokemon-card');
  var VISIBLE_BATCH = 12; // ~2 rows on any screen size
  cards.forEach(function (card, i) {
    if (i < VISIBLE_BATCH) {
      card.style.setProperty('--card-index', i);
    } else {
      card.style.animation = 'none';
      card.style.opacity = '1';
    }
  });
}

function staggerGameCards() {
  document.querySelectorAll('.game-card').forEach(function (card, i) {
    card.style.animationDelay = (i * 0.07) + 's';
    card.style.animationFillMode = 'both';
  });
}

function staggerPdexCards() {
  // Only animate first 24 cards - rest appear instantly to avoid lag on large grids
  document.querySelectorAll('.pdex-card').forEach(function (card, i) {
    if (i < 24) {
      card.style.animation = 'pdexCardPop 0.3s cubic-bezier(0.34,1.56,0.64,1) ' + (i * 0.018) + 's both';
    } else {
      card.style.animation = 'none';
      card.style.opacity = '1';
    }
  });
}

function staggerMoveRows(container) {
  // Only animate first 12 rows for perf
  (container || document).querySelectorAll('.moves-table tbody tr').forEach(function (row, i) {
    if (i < 12) {
      row.style.animation = 'slideRight 0.28s ease ' + (i * 0.022) + 's both';
    } else {
      row.style.animation = 'none';
      row.style.opacity = '1';
    }
  });
}

function staggerBiomeTags(container) {
  (container || document).querySelectorAll('.biome-tag').forEach(function (tag, i) {
    tag.style.animationDelay = Math.min(i * 0.03, 0.55) + 's';
    tag.style.animationFillMode = 'both';
  });
}

function animateCounter(el, target, duration) {
  duration = duration || 900;
  var start = null;
  var isPercent = el.dataset.pct === '1';
  function step(ts) {
    if (!start) start = ts;
    var p = Math.min((ts - start) / duration, 1);
    var ease = 1 - Math.pow(1 - p, 3);
    el.textContent = isPercent ? (ease * target).toFixed(1) + '%' : Math.round(ease * target);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function initPdexCounters() {
  var pcts = document.querySelectorAll('.pdex-stat-pct[data-target]');
  if (!pcts.length) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var el = entry.target;
        var target = parseFloat(el.dataset.target);
        if (!isNaN(target)) animateCounter(el, target, 900);
        io.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  pcts.forEach(function (el) { io.observe(el); });
}

// ====================== Init ======================
document.addEventListener('DOMContentLoaded', async function () {
  loadSettings();
  buildSettingsPanel();
  showLoadingState();
  var ok = await loadData();
  hideLoadingState();

  if (!ok) {
    showDataError();
    return;
  }

  var grid = document.getElementById('pokemonGrid');
  if (grid) {
    buildFilters();
    renderCompletion();
    renderPotd();
    renderRecentlyViewed();
    renderTop5();
    renderGrid(State.allPokemon, true);
    setTimeout(playAllVideos, 100);
    var searchInput = document.getElementById('searchInput');
    var typeFilter = document.getElementById('typeFilter');
    var genFilter = document.getElementById('genFilter');
    if (searchInput) {
      var _searchDebounce;
      searchInput.addEventListener('input', function () {
        clearTimeout(_searchDebounce);
        _searchDebounce = setTimeout(function () {
          filterPokemon();
          setTimeout(playAllVideos, 100);
        }, 160);
      });
    }
    if (typeFilter) typeFilter.addEventListener('change', function () { filterPokemon(); setTimeout(playAllVideos, 100); }, { passive: true });
    if (genFilter) genFilter.addEventListener('change', function () { filterPokemon(); setTimeout(playAllVideos, 100); }, { passive: true });
  }

  if (document.getElementById('pokemonDetail')) {
    loadPokemonDetail();
    setTimeout(playAllVideos, 100);
  }

  if (document.getElementById('moveDetail')) {
    loadMoveDetail();
  }

  if (document.getElementById('abilityDetail')) {
    loadAbilityDetail();
  }

  if (document.getElementById('compareResult')) {
    loadComparePage();
  }

  if (document.getElementById('mdTableWrap')) {
    loadMoveDexPage();
  }

  if (document.getElementById('tbResultPanel')) {
    loadTeamBuilderPage();
  }

  if (document.getElementById('gamesTimeline')) {
    loadGamesPage();
  }

  if (document.getElementById('rndResultPanel')) {
    loadRandomizerPage();
  }

  if (document.getElementById('pdexGrid')) {
    loadPersonalPokedex();
    setTimeout(function () { staggerPdexCards(); initPdexCounters(); }, 50);
  }

  if (document.getElementById('rpApp')) {
    rpInit();
  }

  initScrollReveal();

  // Back to top visibility
  var backToTop = document.getElementById('backToTop');
  if (backToTop) {
    var _scrollTick = false;
    window.addEventListener('scroll', function () {
      if (!_scrollTick) {
        _scrollTick = true;
        requestAnimationFrame(function () {
          backToTop.classList.toggle('visible', window.scrollY > 400);
          _scrollTick = false;
        });
      }
    }, { passive: true });
  }
});


// ====================== Compare Page ======================
var TYPE_CHART = {
  Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
  Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
  Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
  Ice: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
  Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2, Fairy: 0.5 },
  Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2 },
  Ground: { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
  Flying: { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
  Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
  Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Dark: 2, Steel: 0.5, Fairy: 0.5 },
  Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
  Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
  Dragon: { Dragon: 2, Steel: 0.5, Fairy: 0 },
  Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Fairy: 0.5 },
  Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5, Fairy: 2 },
  Fairy: { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Dark: 2, Steel: 0.5 },
};

var ALL_TYPES = ['Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'];

var STAT_LABELS = { hp: 'HP', attack: 'Attack', defense: 'Defense', spAttack: 'Sp. Atk', spDefense: 'Sp. Def', speed: 'Speed' };

function loadComparePage() {
  // Populate Pokémon pickers
  var opts = State.allPokemon.map(function (p) {
    var num = p.number || String(p.id).padStart(4, '0');
    return '<option value="' + p.id + '">#' + num + ' ' + p.name + '</option>';
  }).join('');

  ['picker1', 'picker2'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML += opts;
  });

  // Populate move picker
  var moveOpts = Object.keys(State.allMoves).sort().map(function (name) {
    return '<option value="' + name + '">' + name + '</option>';
  }).join('');
  var calcMove = document.getElementById('calcMove');
  if (calcMove) calcMove.innerHTML += moveOpts;

  // Populate type pickers
  var typeOpts = ALL_TYPES.map(function (t) {
    return '<option value="' + t + '">' + t + '</option>';
  }).join('');
  ['calcAttackerType', 'calcDefType1', 'calcDefType2'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML += typeOpts;
  });
}

window.runCompare = function () {
  var id1 = parseInt(document.getElementById('picker1').value);
  var id2 = parseInt(document.getElementById('picker2').value);
  var result = document.getElementById('compareResult');
  if (!result) return;

  if (!id1 || !id2) { result.innerHTML = ''; return; }

  var p1 = getPokemonById(id1);
  var p2 = getPokemonById(id2);
  if (!p1 || !p2) return;

  var stats = Object.keys(STAT_LABELS);
  var maxVals = {};
  stats.forEach(function (k) {
    maxVals[k] = Math.max((p1.baseStats || {})[k] || 0, (p2.baseStats || {})[k] || 0, 1);
  });

  var total1 = stats.reduce(function (t, k) { return t + ((p1.baseStats || {})[k] || 0); }, 0);
  var total2 = stats.reduce(function (t, k) { return t + ((p2.baseStats || {})[k] || 0); }, 0);

  function statRows(poke, other) {
    return stats.map(function (k) {
      var val = (poke.baseStats || {})[k] || 0;
      var oval = (other.baseStats || {})[k] || 0;
      var pct = ((val / 255) * 100).toFixed(1);
      var wins = val > oval;
      var color = wins ? '#3eca6e' : val === oval ? '#facc15' : '#f87171';
      return (
        '<div class="cmp-stat-row">' +
        '<span class="stat-label">' + STAT_LABELS[k] + '</span>' +
        '<span class="stat-value stat-value-anim" style="color:' + color + '" data-target="' + val + '">0</span>' +
        '<div class="stat-bar-bg">' +
        '<div class="stat-bar-fill stat-bar-anim" style="width:0%;background:' + color + '" data-width="' + pct + '"></div>' +
        '</div>' +
        '</div>'
      );
    }).join('');
  }

  function pokeCard(poke, total, other) {
    var sprite = poke.video || poke.sprite;
    var wins = total > (other.baseStats ? Object.keys(STAT_LABELS).reduce(function (t, k) { return t + ((other.baseStats || {})[k] || 0); }, 0) : 0);
    var num = poke.number || String(poke.id).padStart(4, '0');
    return (
      '<div class="cmp-card' + (wins ? ' cmp-winner' : '') + '">' +
      (wins ? '<div class="cmp-winner-badge">Winner</div>' : '') +
      '<div class="cmp-sprite-wrap">' + buildSpriteEl(sprite, poke.name, 'cmp-sprite') + '</div>' +
      '<p class="cmp-number">#' + num + '</p>' +
      '<h3 class="cmp-name"><a href="pokemon.html?id=' + poke.id + '" class="move-link">' + poke.name + '</a></h3>' +
      '<div class="badge-row" style="justify-content:center;margin-bottom:0.75rem">' + buildTypeBadges(poke.types) + '</div>' +
      '<div class="cmp-stats">' + statRows(poke, other) + '</div>' +
      '<div class="cmp-total" style="color:' + (wins ? '#4ade80' : total === total2 ? '#facc15' : '#f87171') + '">Total: ' + total + '</div>' +
      '</div>'
    );
  }

  result.innerHTML =
    '<div class="cmp-result">' +
    pokeCard(p1, total1, p2) +
    '<div class="cmp-divider">VS</div>' +
    pokeCard(p2, total2, p1) +
    '</div>';

  animateStatBars(result);
  setTimeout(playAllVideos, 100);
  observeNewRevealTargets(result);
};

window.runCalc = function () {
  var moveName = document.getElementById('calcMove').value;
  var atkType = document.getElementById('calcAttackerType').value;
  var defType1 = document.getElementById('calcDefType1').value;
  var defType2 = document.getElementById('calcDefType2').value;
  var result = document.getElementById('calcResult');
  if (!result) return;

  if (!moveName || !defType1) { result.innerHTML = ''; return; }

  var move = State.allMoves[moveName];
  var moveType = move ? move.type : atkType;
  var power = parseInt(move && move.power) || 0;

  // Type effectiveness
  function effectiveness(attackType, defType) {
    if (!attackType || !defType) return 1;
    var chart = TYPE_CHART[attackType] || {};
    return chart[defType] !== undefined ? chart[defType] : 1;
  }

  var mult1 = effectiveness(moveType, defType1);
  var mult2 = defType2 ? effectiveness(moveType, defType2) : 1;
  var total = mult1 * mult2;

  var color = total >= 2 ? '#4ade80' : total === 1 ? '#facc15' : total > 0 ? '#f87171' : '#6b7280';
  var label = total === 0 ? 'No effect' : total < 1 ? 'Not very effective' : total === 1 ? 'Normal effectiveness' : 'Super effective!';

  var stab = moveType && atkType && moveType === atkType ? 1.5 : 1;
  var baseDmg = power ? Math.round(power * total * stab) : null;

  result.innerHTML =
    '<div class="calc-result">' +
    '<div class="calc-multiplier" style="color:' + color + '">' + total + 'x</div>' +
    '<div class="calc-label-text" style="color:' + color + '">' + label + '</div>' +
    '<div class="calc-breakdown">' +
    '<span class="calc-chip">Move: <strong>' + moveName + '</strong></span>' +
    '<span class="calc-chip">Type: <strong>' + (moveType || '?') + '</strong></span>' +
    (power ? '<span class="calc-chip">Base Power: <strong>' + power + '</strong></span>' : '') +
    (stab > 1 ? '<span class="calc-chip stab">STAB ×1.5</span>' : '') +
    (baseDmg ? '<span class="calc-chip">Estimated Power: <strong>' + baseDmg + '</strong></span>' : '') +
    '</div>' +
    '</div>';
  staggerMoveRows(content);
};


// ====================== Games Timeline Page ======================
var REGION_COLORS = {
  Kanto: '#e53935',
  Johto: '#fdd835',
  Hoenn: '#1e88e5',
  Sinnoh: '#8e24aa',
  Unova: '#757575',
  Kalos: '#3949ab',
  Alola: '#fb8c00',
  Galar: '#6d4c41',
  Paldea: '#c0ca33',
};

function loadGamesPage() {
  var container = document.getElementById('gamesTimeline');
  if (!container) return;

  var games = State.allGames;
  if (!games.length) {
    container.innerHTML = '<p class="moves-empty">No games data found.</p>';
    return;
  }

  var sorted = games.slice().sort(function (a, b) { return a.row - b.row; });

  var html = sorted.map(function (row, rowIndex) {
    var cards = (row.entries || []).map(function (game) {
      var genLabel = game.generation ? 'Gen ' + game.generation : '';
      var regionColor = REGION_COLORS[game.region] || '#9ca3af';
      var gameColor = game.color || null;

      // Build inline CSS variables
      var styleVars = '';
      if (gameColor) {
        styleVars += '--game-color:' + gameColor + '08;';
        styleVars += '--game-border:' + gameColor + '55;';
        styleVars += '--game-accent:' + gameColor + ';';
        // Dark mode: dark base bleeding into game colour
        styleVars += '--game-gradient:linear-gradient(135deg, #080b0f 0%, ' + gameColor + '50 100%);';
        // Light mode: pure white base with a gentle colour tint
        styleVars += '--game-gradient-light:linear-gradient(135deg, ' + gameColor + '18 0%, ' + gameColor + '08 100%);';
        // Light mode border: more visible but not heavy
        styleVars += '--game-border-light:' + gameColor + '70;';
      }
      styleVars += '--region-color:' + regionColor + ';';
      styleVars += '--region-bg:' + regionColor + '18;';

      return (
        '<div class="game-card" style="' + styleVars + '">' +
        '<div class="game-card-top">' +
        (game.logo
          ? '<img src="' + game.logo + '" alt="' + game.name + '" class="game-logo" onerror="this.style.display=\'none\'">'
          : '<div class="game-logo-placeholder">🎮</div>') +
        '<div class="game-badge-row">' +
        (genLabel ? '<span class="game-badge">' + genLabel + '</span>' : '') +
        (game.region ? '<span class="game-badge game-badge-region">' + game.region + '</span>' : '') +
        '</div>' +
        '</div>' +
        '<h3 class="game-name">' + game.name + '</h3>' +
        (game.year ? '<p class="game-year">' + game.year + '</p>' : '') +
        (game.description ? '<p class="game-desc">' + game.description + '</p>' : '') +
        '</div>'
      );
    }).join('<div class="game-same-row-divider">+</div>');

    var connector = rowIndex < sorted.length - 1
      ? '<div class="game-connector"><div class="game-connector-line"></div><div class="game-connector-arrow">▼</div></div>'
      : '';

    return (
      '<div class="game-row">' +
      '<div class="game-row-inner">' + cards + '</div>' +
      '</div>' +
      connector
    );
  }).join('');

  container.innerHTML = html;
}


// ====================== Personal Pokédex ======================
var _pdexFilter = 'all';
var _pdexProgress = {}; // { id: { seen: bool, captured: bool } }

function loadPersonalPokedex() {
  // Load saved progress
  try {
    var saved = localStorage.getItem('pdexProgress');
    if (saved) _pdexProgress = JSON.parse(saved);
  } catch (e) { }

  loadVariantProgress();

  var total = State.allPokemon.length;
  document.getElementById('pdexTotal').textContent = total;

  updatePdexStats();
  renderPdexGrid();
  renderPdexVariantGrid();
}

function savePdexProgress() {
  try { localStorage.setItem('pdexProgress', JSON.stringify(_pdexProgress)); } catch (e) { }
}

function updatePdexStats() {
  var total = State.allPokemon.length;
  var captured = 0;
  var seen = 0;
  var legendary = 0;
  var mythical = 0;

  State.allPokemon.forEach(function (poke) {
    var p = _pdexProgress[poke.id] || {};
    if (p.captured) {
      captured++;
      if (poke.legendary) legendary++;
      if (poke.mythical) mythical++;
    }
    if (p.seen || p.captured) seen++;
  });

  var capPct = total ? Math.round((captured / total) * 100) : 0;
  var seenPct = total ? Math.round((seen / total) * 100) : 0;

  var capPctEl = document.getElementById('capturedPct');
  var seenPctEl = document.getElementById('seenPct');
  var legEl = document.getElementById('legendaryCount');
  var mythEl = document.getElementById('mythicalCount');
  if (capPctEl) { capPctEl.textContent = capPct + '%'; capPctEl.dataset.target = capPct; capPctEl.dataset.pct = '1'; }
  if (seenPctEl) { seenPctEl.textContent = seenPct + '%'; seenPctEl.dataset.target = seenPct; seenPctEl.dataset.pct = '1'; }
  if (legEl) { legEl.textContent = legendary; legEl.dataset.target = legendary; }
  if (mythEl) { mythEl.textContent = mythical; mythEl.dataset.target = mythical; }
  document.getElementById('capturedCount').textContent = captured + '/' + total;
  document.getElementById('seenCount').textContent = seen + '/' + total;

  // Update missing button label
  var missing = total - captured;
  var missingBtn = document.getElementById('missingBtn');
  if (missingBtn) missingBtn.textContent = 'Missing (' + missing + ')';
}

function renderPdexGrid() {
  var grid = document.getElementById('pdexGrid');
  if (!grid) return;

  var list = State.allPokemon.filter(function (poke) {
    var p = _pdexProgress[poke.id] || {};
    switch (_pdexFilter) {
      case 'captured': return p.captured;
      case 'seen': return (p.seen || p.captured) && !p.captured ? true : p.seen && !p.captured;
      case 'legendary': return poke.legendary;
      case 'mythical': return poke.mythical;
      case 'missing': return !p.captured;
      default: return true;
    }
  });

  if (list.length === 0) {
    grid.innerHTML = '<p class="moves-empty" style="grid-column:1/-1">No Pokémon in this category.</p>';
    return;
  }

  grid.innerHTML = list.map(function (poke) {
    var p = _pdexProgress[poke.id] || {};
    var sprite = poke.video || poke.sprite;
    var num = poke.number || String(poke.id).padStart(4, '0');
    var isSeen = p.seen || p.captured;
    var isCap = p.captured;

    return (
      '<div class="pdex-card' + (isCap ? ' pdex-captured' : isSeen ? ' pdex-seen' : '') + '">' +
      '<div class="pdex-card-btns">' +
      '<button class="pdex-btn pdex-btn-seen' + (isSeen ? ' active' : '') + '" onclick="toggleSeen(' + poke.id + ')" title="Mark as Seen">👁</button>' +
      '<button class="pdex-btn pdex-btn-cap' + (isCap ? ' active' : '') + '" onclick="toggleCaptured(' + poke.id + ')" title="Mark as Captured">✓</button>' +
      '</div>' +
      '<div class="pdex-sprite-wrap">' +
      (isSeen
        ? buildSpriteEl(sprite, poke.name, 'pdex-sprite')
        : '<div class="pdex-sprite-unknown">?</div>') +
      '</div>' +
      '<a href="pokemon.html?id=' + poke.id + '" class="pdex-num">#' + num + '</a>' +
      '</div>'
    );
  }).join('');

  setTimeout(playAllVideos, 100);
}

// Render the separate "Variant Forms" grid — all variants across all Pokémon,
// tracked independently and excluded from the main Pokédex count.
// Includes the base/"Normal" form alongside its named variants so all forms
// of a multi-variant species (e.g. Oricorio Baile/Pom Pom/Pa'u/Sensu) show together.
function renderPdexVariantGrid() {
  var grid = document.getElementById('pdexVariantGrid');
  if (!grid) return;

  var entries = [];
  State.allPokemon.forEach(function (poke) {
    if (!poke.variants || !poke.variants.length) return;
    // Synthesize a "Normal" entry representing the base form
    entries.push({
      poke: poke,
      variant: {
        name: 'Normal',
        sprite: poke.sprite,
        video: poke.video,
        shinySprite: poke.shinySprite,
        shinyVideo: poke.shinyVideo
      }
    });
    poke.variants.forEach(function (variant) {
      entries.push({ poke: poke, variant: variant });
    });
  });

  if (!entries.length) {
    grid.innerHTML = '<p class="moves-empty" style="grid-column:1/-1">No variant forms available.</p>';
    return;
  }

  // Apply the same filter as the main grid
  entries = entries.filter(function (e) {
    var key = variantKey(e.poke.id, e.variant.name);
    var p = _variantProgress[key] || {};
    switch (_pdexFilter) {
      case 'captured': return p.captured;
      case 'seen': return p.seen && !p.captured;
      case 'legendary': return e.poke.legendary;
      case 'mythical': return e.poke.mythical;
      case 'missing': return !p.captured;
      default: return true;
    }
  });

  if (entries.length === 0) {
    grid.innerHTML = '<p class="moves-empty" style="grid-column:1/-1">No variant forms in this category.</p>';
    return;
  }

  grid.innerHTML = entries.map(function (e) {
    var poke = e.poke;
    var variant = e.variant;
    var key = variantKey(poke.id, variant.name);
    var p = _variantProgress[key] || {};
    var sprite = variant.video || variant.sprite || poke.video || poke.sprite;
    var isSeen = p.seen || p.captured;
    var isCap = p.captured;
    var num = poke.number || String(poke.id).padStart(4, '0');

    var isNormal = variant.name === 'Normal';
    var displayName = isNormal ? poke.name : variant.name;

    return (
      '<div class="pdex-card pdex-variant-card' + (isNormal ? ' pdex-variant-base' : '') + (isCap ? ' pdex-captured' : isSeen ? ' pdex-seen' : '') + '">' +
      '<div class="pdex-card-btns">' +
      '<button class="pdex-btn pdex-btn-seen' + (isSeen ? ' active' : '') + '" onclick="toggleVariantSeen(' + poke.id + ', \'' + variant.name.replace(/'/g, "\\'") + '\'); renderPdexVariantGrid();" title="Mark as Seen">👁</button>' +
      '<button class="pdex-btn pdex-btn-cap' + (isCap ? ' active' : '') + '" onclick="toggleVariantCaptured(' + poke.id + ', \'' + variant.name.replace(/'/g, "\\'") + '\'); renderPdexVariantGrid();" title="Mark as Captured">✓</button>' +
      '</div>' +
      '<div class="pdex-sprite-wrap">' +
      (isSeen
        ? buildSpriteEl(sprite, displayName, 'pdex-sprite')
        : '<div class="pdex-sprite-unknown">?</div>') +
      '</div>' +
      '<a href="pokemon.html?id=' + poke.id + '" class="pdex-num pdex-variant-name">' +
      '<span class="pdex-variant-name-main">' + displayName + '</span>' +
      '<span class="pdex-variant-name-sub">#' + num + '</span>' +
      '</a>' +
      '</div>'
    );
  }).join('');

  setTimeout(playAllVideos, 100);
}

window.toggleSeen = function (id) {
  var p = _pdexProgress[id] || {};
  if (p.seen && !p.captured) {
    // unsee
    delete _pdexProgress[id];
  } else {
    p.seen = true;
    _pdexProgress[id] = p;
  }
  savePdexProgress();
  updatePdexStats();
  renderPdexGrid();
  staggerPdexCards();
};

window.toggleCaptured = function (id) {
  var p = _pdexProgress[id] || {};
  if (p.captured) {
    // uncapture but keep seen
    p.captured = false;
    p.seen = true;
  } else {
    p.captured = true;
    p.seen = true;
  }
  _pdexProgress[id] = p;
  savePdexProgress();
  updatePdexStats();
  renderPdexGrid();
  staggerPdexCards();
};

window.setPdexFilter = function (filter) {
  _pdexFilter = filter;
  document.querySelectorAll('.pdex-filter').forEach(function (btn) {
    btn.classList.remove('active');
    if (btn.getAttribute('onclick') === "setPdexFilter('" + filter + "')") {
      btn.classList.add('active');
    }
  });
  renderPdexGrid();
  renderPdexVariantGrid();
  staggerPdexCards();
};

window.exportProgress = function () {
  var combined = {
    pokedex: _pdexProgress,
    variants: _variantProgress
  };
  var data = JSON.stringify(combined, null, 2);
  var blob = new Blob([data], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'pokedex-progress.json';
  a.click();
  URL.revokeObjectURL(url);
};

window.importProgress = function (event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var parsed = JSON.parse(e.target.result);
      // New format: { pokedex: {...}, variants: {...} }
      // Old format: flat object of pdex progress only
      if (parsed.pokedex || parsed.variants) {
        _pdexProgress = parsed.pokedex || {};
        _variantProgress = parsed.variants || {};
      } else {
        _pdexProgress = parsed;
      }
      savePdexProgress();
      saveVariantProgress();
      updatePdexStats();
      renderPdexGrid();
      renderPdexVariantGrid();
    } catch (err) {
      alert('Invalid progress file.');
    }
  };
  reader.readAsText(file);
};

window.resetProgress = function () {
  if (!confirm('Reset all progress? This cannot be undone.')) return;
  _pdexProgress = {};
  _variantProgress = {};
  savePdexProgress();
  saveVariantProgress();
  updatePdexStats();
  renderPdexGrid();
  renderPdexVariantGrid();
};

// ====================== Randomizer Page ======================
var RND = {
  types: new Set(),
  gens: new Set(),
  evoStages: new Set(),
  special: new Set(),
  pool: [],
};

var STAT_KEYS = [
  { key: 'hp', label: 'HP' },
  { key: 'attack', label: 'Attack' },
  { key: 'defense', label: 'Defense' },
  { key: 'spAttack', label: 'Sp. Atk' },
  { key: 'spDefense', label: 'Sp. Def' },
  { key: 'speed', label: 'Speed' },
];

function getEvoStage(poke) {
  var evo = poke.evolutions || [];
  var names = evo.map(function (e) { return e.name; });
  var idx = names.indexOf(poke.name);
  return idx === -1 ? 0 : idx;
}

function buildRandomizerPool() {
  // Base species always included
  var pool = State.allPokemon.map(function (p) {
    return Object.assign({}, p, { _kind: 'base', _baseId: p.id, _baseName: p.name });
  });

  var includeMega = document.getElementById('rndIncludeMega').checked;
  var includeGmax = document.getElementById('rndIncludeGmax').checked;

  State.allPokemon.forEach(function (p) {
    if (includeMega && Array.isArray(p.megaEvolutions)) {
      p.megaEvolutions.forEach(function (m) {
        pool.push(Object.assign({}, p, m, {
          _kind: 'mega',
          _baseId: p.id,
          _baseName: p.name,
          name: m.name,
          evolutions: p.evolutions,
          generation: p.generation,
          legendary: p.legendary,
          mythical: p.mythical,
        }));
      });
    }
    if (includeGmax && Array.isArray(p.variants)) {
      p.variants.forEach(function (v) {
        if (!/gigantamax/i.test(v.name)) return;
        pool.push(Object.assign({}, p, v, {
          _kind: 'gmax',
          _baseId: p.id,
          _baseName: p.name,
          name: v.name,
          evolutions: p.evolutions,
          generation: p.generation,
          legendary: p.legendary,
          mythical: p.mythical,
        }));
      });
    }
  });

  return pool;
}

function buildRandomizerFilterUI() {
  // Types
  var types = [...new Set(State.allPokemon.flatMap(function (p) { return p.types || []; }))].sort();
  var typeWrap = document.getElementById('rndTypeChips');
  typeWrap.innerHTML = types.map(function (t) {
    var tl = t.toLowerCase();
    return '<button class="rnd-chip" data-type="' + tl + '" onclick="toggleRndSet(RND.types, \'' + tl + '\', this)">' + t + '</button>';
  }).join('');

  // Generations
  var gens = [...new Set(State.allPokemon.map(function (p) { return p.generation; }).filter(Boolean))].sort(function (a, b) { return a - b; });
  var genWrap = document.getElementById('rndGenChips');
  genWrap.innerHTML = gens.map(function (g) {
    return '<button class="rnd-chip" data-gen="' + g + '" onclick="toggleRndSet(RND.gens, ' + g + ', this)">Gen ' + g + '</button>';
  }).join('');

  // Stat sliders
  var maxStat = 0;
  State.allPokemon.forEach(function (p) {
    var bs = p.baseStats || {};
    STAT_KEYS.forEach(function (s) { if (bs[s.key] > maxStat) maxStat = bs[s.key]; });
  });
  maxStat = Math.max(maxStat, 100);

  var sliderWrap = document.getElementById('rndStatSliders');
  sliderWrap.innerHTML = STAT_KEYS.map(function (s) {
    return (
      '<div class="rnd-stat-cell">' +
      '<div class="rnd-stat-cell-head">' +
      '<span class="rnd-stat-cell-label">' + s.label + '</span>' +
      '<span class="rnd-stat-cell-value" id="rndStatVal_' + s.key + '">0</span>' +
      '</div>' +
      '<input type="range" class="rnd-slider" id="rndStat_' + s.key + '" min="0" max="' + maxStat + '" value="0" step="1" ' +
      'oninput="document.getElementById(\'rndStatVal_' + s.key + '\').textContent=this.value">' +
      '</div>'
    );
  }).join('');

  // Abilities
  var abilities = [...new Set(State.allPokemon.flatMap(function (p) { return (p.abilities || []).map(function (a) { return a.replace(/\s*\(Hidden\)/i, '').trim(); }); }))].sort();
  var abilityList = document.getElementById('rndAbilityList');
  abilityList.innerHTML = abilities.map(function (a) { return '<option value="' + a + '">'; }).join('');

  // Special chips
  document.querySelectorAll('[data-special]').forEach(function (btn) {
    btn.onclick = function () { toggleRndSet(RND.special, btn.getAttribute('data-special'), btn); };
  });

  // Evolution chips
  document.querySelectorAll('[data-evo]').forEach(function (btn) {
    btn.onclick = function () { toggleRndSet(RND.evoStages, parseInt(btn.getAttribute('data-evo'), 10), btn); };
  });

  // Regional variants aren't tagged in this dataset yet — toggle stays disabled with an explanation
}

function toggleRndSet(set, value, btn) {
  if (set.has(value)) { set.delete(value); btn.classList.remove('active'); }
  else { set.add(value); btn.classList.add('active'); }
}

function passesRndFilters(poke) {
  // Types — match ANY selected type
  if (RND.types.size > 0) {
    var pTypes = (poke.types || []).map(function (t) { return t.toLowerCase(); });
    var hasType = pTypes.some(function (t) { return RND.types.has(t); });
    if (!hasType) return false;
  }

  // Generation
  if (RND.gens.size > 0 && !RND.gens.has(poke.generation)) return false;

  // Evolution stage (only meaningful for base-species entries)
  if (RND.evoStages.size > 0) {
    var stage = getEvoStage(poke);
    if (!RND.evoStages.has(stage)) return false;
  }

  // Minimum stats
  var bs = poke.baseStats || {};
  for (var i = 0; i < STAT_KEYS.length; i++) {
    var s = STAT_KEYS[i];
    var minEl = document.getElementById('rndStat_' + s.key);
    var min = minEl ? parseInt(minEl.value, 10) : 0;
    if (min > 0 && (bs[s.key] || 0) < min) return false;
  }

  // Ability
  var abilityQuery = document.getElementById('rndAbility').value.trim().toLowerCase();
  if (abilityQuery) {
    var pAbilities = (poke.abilities || []).map(function (a) { return a.replace(/\s*\(Hidden\)/i, '').trim().toLowerCase(); });
    if (!pAbilities.some(function (a) { return a === abilityQuery || a.indexOf(abilityQuery) !== -1; })) return false;
  }

  // Special
  if (RND.special.has('legendary') && !poke.legendary) return false;
  if (RND.special.has('mythical') && !poke.mythical) return false;

  return true;
}

function generateRandomPokemon() {
  var count = parseInt(document.getElementById('rndCount').value, 10) || 1;
  var pool = buildRandomizerPool().filter(passesRndFilters);

  var panel = document.getElementById('rndResultPanel');

  if (pool.length === 0) {
    panel.innerHTML = '<div class="rnd-no-match">😕 No Pokémon match these filters. Try loosening some constraints.</div>';
    return;
  }

  // Shuffle and pick without replacement (falls back to allowing repeats if pool is smaller than count)
  var shuffled = pool.slice().sort(function () { return Math.random() - 0.5; });
  var picks = [];
  if (shuffled.length >= count) {
    picks = shuffled.slice(0, count);
  } else {
    for (var i = 0; i < count; i++) {
      picks.push(shuffled[Math.floor(Math.random() * shuffled.length)]);
    }
  }

  panel.innerHTML = '<div class="rnd-results-grid">' + picks.map(buildRndResultCard).join('') + '</div>';
  setTimeout(playAllVideos, 100);
}

function buildRndResultCard(poke) {
  var num = (poke.number || String(poke._baseId).padStart(4, '0'));
  var sprite = poke.video || poke.sprite || '';
  var tag = '';
  if (poke._kind === 'mega') tag = '<span class="rnd-result-tag">Mega</span>';
  else if (poke._kind === 'gmax') tag = '<span class="rnd-result-tag">Gigantamax</span>';
  else if (poke._kind === 'variant') tag = '<span class="rnd-result-tag">Variant</span>';

  return (
    '<a href="pokemon.html?id=' + poke._baseId + '" class="rnd-result-card">' +
    tag +
    buildSpriteEl(sprite, poke.name, 'rnd-result-sprite', 'assets/images/placeholder.png') +
    '<p class="rnd-result-number">#' + num + '</p>' +
    '<p class="rnd-result-name">' + poke.name + '</p>' +
    '</a>'
  );
}

function resetRandomizerFilters() {
  RND.types = new Set();
  RND.gens = new Set();
  RND.evoStages = new Set();
  RND.special = new Set();

  document.querySelectorAll('.rnd-chip.active').forEach(function (b) { b.classList.remove('active'); });
  document.getElementById('rndIncludeMega').checked = false;
  document.getElementById('rndIncludeGmax').checked = false;
  document.getElementById('rndAbility').value = '';
  document.getElementById('rndCount').value = '6';

  STAT_KEYS.forEach(function (s) {
    var el = document.getElementById('rndStat_' + s.key);
    var val = document.getElementById('rndStatVal_' + s.key);
    if (el) el.value = 0;
    if (val) val.textContent = '0';
  });

  var panel = document.getElementById('rndResultPanel');
  panel.innerHTML = '<div class="rnd-empty-state"><div class="rnd-empty-icon">◌</div><p>No draw yet. Adjust your filters above and hit <strong>Generate</strong>.</p></div>';
}

function loadRandomizerPage() {
  buildRandomizerFilterUI();
}

// ====================== Team Builder Page ======================
var TB = {
  types: new Set(),
  gens: new Set(),
};

var TEAM_SIZE = 6;
var TEAM = { members: [], megaIndex: null, gmaxIndex: null };

// A Pokémon's "megaEvolutions" array actually holds BOTH Mega and Gigantamax
// forms — distinguished only by name prefix. These helpers split them out.
function getMegaForms(poke) {
  return (poke.megaEvolutions || []).filter(function (f) { return /^Mega /i.test(f.name); });
}
function getGmaxForms(poke) {
  return (poke.megaEvolutions || []).filter(function (f) { return /^Gigantamax /i.test(f.name); });
}

function bstOf(baseStats) {
  var bs = baseStats || {};
  return STAT_KEYS.reduce(function (sum, s) { return sum + (bs[s.key] || 0); }, 0);
}

function buildTeamBuilderFilterUI() {
  var types = [...new Set(State.allPokemon.flatMap(function (p) { return p.types || []; }))].sort();
  var typeWrap = document.getElementById('tbTypeChips');
  typeWrap.innerHTML = types.map(function (t) {
    var tl = t.toLowerCase();
    return '<button class="rnd-chip" data-type="' + tl + '" onclick="toggleTbSet(TB.types, \'' + tl + '\', this)">' + t + '</button>';
  }).join('');

  var gens = [...new Set(State.allPokemon.map(function (p) { return p.generation; }).filter(Boolean))].sort(function (a, b) { return a - b; });
  var genWrap = document.getElementById('tbGenChips');
  genWrap.innerHTML = gens.map(function (g) {
    return '<button class="rnd-chip" data-gen="' + g + '" onclick="toggleTbSet(TB.gens, ' + g + ', this)">Gen ' + g + '</button>';
  }).join('');
}

function toggleTbSet(set, value, btn) {
  if (set.has(value)) { set.delete(value); btn.classList.remove('active'); }
  else { set.add(value); btn.classList.add('active'); }
}

function passesTbFilters(poke) {
  if (TB.types.size > 0) {
    var pTypes = (poke.types || []).map(function (t) { return t.toLowerCase(); });
    if (!pTypes.some(function (t) { return TB.types.has(t); })) return false;
  }
  if (TB.gens.size > 0 && !TB.gens.has(poke.generation)) return false;

  var allowLegendary = document.getElementById('tbAllowLegendary').checked;
  var allowMythical = document.getElementById('tbAllowMythical').checked;
  if (!allowLegendary && poke.legendary) return false;
  if (!allowMythical && poke.mythical) return false;

  return true;
}

function buildTeamPool() {
  return State.allPokemon.filter(passesTbFilters);
}

function pickRandomMember(pool, excludeIds) {
  var available = pool.filter(function (p) { return excludeIds.indexOf(p.id) === -1; });
  var choices = available.length > 0 ? available : pool;
  return choices[Math.floor(Math.random() * choices.length)];
}

window.generateTeam = function () {
  var pool = buildTeamPool();
  var panel = document.getElementById('tbResultPanel');

  if (pool.length === 0) {
    panel.innerHTML = '<div class="rnd-no-match">😕 No Pokémon match these filters. Try loosening some constraints.</div>';
    document.getElementById('tbSummaryBar').style.display = 'none';
    return;
  }

  var usedIds = [];
  var members = [];
  for (var i = 0; i < TEAM_SIZE; i++) {
    var pick = pickRandomMember(pool, usedIds);
    usedIds.push(pick.id);
    members.push({ base: pick, activeKind: 'base' });
  }

  TEAM.members = members;
  TEAM.megaIndex = null;
  TEAM.gmaxIndex = null;
  renderTeam();
};

window.rerollTeamSlot = function (index) {
  var pool = buildTeamPool();
  if (pool.length === 0) return;

  var usedIds = TEAM.members.map(function (m, i) { return i === index ? null : m.base.id; }).filter(function (id) { return id !== null; });
  var pick = pickRandomMember(pool, usedIds);

  TEAM.members[index] = { base: pick, activeKind: 'base' };
  if (TEAM.megaIndex === index) TEAM.megaIndex = null;
  if (TEAM.gmaxIndex === index) TEAM.gmaxIndex = null;
  renderTeam();
};

window.toggleTeamMega = function (index) {
  var member = TEAM.members[index];
  if (!member) return;
  var megaForms = getMegaForms(member.base);
  if (megaForms.length === 0) return;

  if (TEAM.megaIndex === index) {
    // Turning this member's Mega off
    member.activeKind = 'base';
    TEAM.megaIndex = null;
  } else {
    // Revert whichever member currently holds the Mega slot
    if (TEAM.megaIndex !== null && TEAM.members[TEAM.megaIndex]) {
      TEAM.members[TEAM.megaIndex].activeKind = 'base';
    }
    member.activeKind = 'mega';
    member.megaForm = megaForms[0];
    TEAM.megaIndex = index;
  }
  renderTeam();
};

window.toggleTeamGmax = function (index) {
  var member = TEAM.members[index];
  if (!member) return;
  var gmaxForms = getGmaxForms(member.base);
  if (gmaxForms.length === 0) return;

  if (TEAM.gmaxIndex === index) {
    member.activeKind = 'base';
    TEAM.gmaxIndex = null;
  } else {
    if (TEAM.gmaxIndex !== null && TEAM.members[TEAM.gmaxIndex]) {
      TEAM.members[TEAM.gmaxIndex].activeKind = 'base';
    }
    member.activeKind = 'gmax';
    member.gmaxForm = gmaxForms[0];
    TEAM.gmaxIndex = index;
  }
  renderTeam();
};

function activeFormOf(member) {
  if (member.activeKind === 'mega' && member.megaForm) {
    return Object.assign({}, member.base, member.megaForm, { name: member.megaForm.name });
  }
  if (member.activeKind === 'gmax' && member.gmaxForm) {
    return Object.assign({}, member.base, member.gmaxForm, { name: member.gmaxForm.name });
  }
  return member.base;
}

function buildTeamSlotCard(member, index) {
  var form = activeFormOf(member);
  var num = form.number || String(member.base.id).padStart(4, '0');
  var sprite = form.video || form.sprite || '';
  var bst = bstOf(form.baseStats);

  var types = (form.types || []).map(function (t) {
    var tl = t.toLowerCase();
    return '<span class="type-badge type-' + tl + ' type-xs"><img src="assets/images/elements/' + tl + '.png" class="type-icon" alt="" onerror="this.style.display=\'none\'">' + t + '</span>';
  }).join('');

  var tag = '';
  if (member.activeKind === 'mega') tag = '<span class="rnd-result-tag">Mega</span>';
  else if (member.activeKind === 'gmax') tag = '<span class="rnd-result-tag">Gigantamax</span>';

  var megaForms = getMegaForms(member.base);
  var gmaxForms = getGmaxForms(member.base);

  var formBtns = '';
  if (megaForms.length > 0) {
    var megaLockedElsewhere = TEAM.megaIndex !== null && TEAM.megaIndex !== index;
    formBtns +=
      '<button class="team-form-btn team-form-btn-mega' + (member.activeKind === 'mega' ? ' active' : '') + '"' +
      (megaLockedElsewhere ? ' disabled title="Only one Mega Evolution allowed per team"' : '') +
      ' onclick="toggleTeamMega(' + index + ')">⚡ Mega</button>';
  }
  if (gmaxForms.length > 0) {
    var gmaxLockedElsewhere = TEAM.gmaxIndex !== null && TEAM.gmaxIndex !== index;
    formBtns +=
      '<button class="team-form-btn team-form-btn-gmax' + (member.activeKind === 'gmax' ? ' active' : '') + '"' +
      (gmaxLockedElsewhere ? ' disabled title="Only one Gigantamax allowed per team"' : '') +
      ' onclick="toggleTeamGmax(' + index + ')">💥 Gmax</button>';
  }

  return (
    '<div class="team-slot-card">' +
    '<button class="team-slot-reroll" onclick="rerollTeamSlot(' + index + ')" title="Reroll this slot">↻</button>' +
    tag +
    '<a href="pokemon.html?id=' + member.base.id + '" class="team-slot-link">' +
    buildSpriteEl(sprite, form.name, 'team-slot-sprite', 'assets/images/placeholder.png') +
    '<p class="team-slot-number">#' + num + '</p>' +
    '<p class="team-slot-name">' + form.name + '</p>' +
    '</a>' +
    '<div class="badge-row" style="justify-content:center;">' + types + '</div>' +
    '<p class="team-slot-bst">BST ' + bst + '</p>' +
    (formBtns ? '<div class="team-slot-form-btns">' + formBtns + '</div>' : '') +
    '</div>'
  );
}

function renderTeam() {
  var panel = document.getElementById('tbResultPanel');
  var summaryBar = document.getElementById('tbSummaryBar');

  var cards = TEAM.members.map(buildTeamSlotCard).join('');
  panel.innerHTML = '<div class="team-grid">' + cards + '</div>';
  setTimeout(playAllVideos, 100);

  var totalBst = TEAM.members.reduce(function (sum, m) { return sum + bstOf(activeFormOf(m).baseStats); }, 0);
  var megaName = TEAM.megaIndex !== null ? activeFormOf(TEAM.members[TEAM.megaIndex]).name : '—';
  var gmaxName = TEAM.gmaxIndex !== null ? activeFormOf(TEAM.members[TEAM.gmaxIndex]).name : '—';

  summaryBar.style.display = 'flex';
  summaryBar.innerHTML =
    '<div class="team-summary-stat"><p class="team-summary-value">' + totalBst + '</p><p class="team-summary-label">Total BST</p></div>' +
    '<div class="team-summary-stat"><p class="team-summary-value" style="font-size:0.95rem;">' + megaName + '</p><p class="team-summary-label">Mega Slot</p></div>' +
    '<div class="team-summary-stat"><p class="team-summary-value" style="font-size:0.95rem;">' + gmaxName + '</p><p class="team-summary-label">Gigantamax Slot</p></div>' +
    '<button class="pdex-action-btn" onclick="copyTeamToClipboard()">📋 Copy Team</button>';
}

window.copyTeamToClipboard = function () {
  var lines = TEAM.members.map(function (m) {
    var form = activeFormOf(m);
    return form.name + ' (' + (form.types || []).join('/') + ', BST ' + bstOf(form.baseStats) + ')';
  });
  var text = 'My Cobblemon Team:\n' + lines.join('\n');

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () {
      rpToast('📋 Team copied to clipboard!', 'success');
    }).catch(function () {
      window.prompt('Copy your team:', text);
    });
  } else {
    window.prompt('Copy your team:', text);
  }
};

window.resetTeamBuilderFilters = function () {
  TB.types = new Set();
  TB.gens = new Set();
  document.querySelectorAll('#tbTypeChips .rnd-chip.active, #tbGenChips .rnd-chip.active').forEach(function (b) { b.classList.remove('active'); });
  document.getElementById('tbAllowLegendary').checked = true;
  document.getElementById('tbAllowMythical').checked = true;
};

function loadTeamBuilderPage() {
  buildTeamBuilderFilterUI();
}

// ====================== Reports Page ======================
// ====================== Reports Page ======================
// =====================================================
//  Cobblemon Reports — Firebase Firestore Backend
// =====================================================

// ---- Constants ----
var ADMIN_USERNAME = 'Admin';
var ADMIN_PASSWORD = 'cobblemon2024admin';
var AUTH_KEY       = 'cobblemon_auth';
var MEMBERS_KEY    = 'cobblemon_members';
var NOTIF_KEY      = 'cobblemon_notifs';

var CATEGORIES = [
  { id: 'bug',        label: '🐛 Website Bug',    cls: 'rp-tag-bug',        needsTarget: false },
  { id: 'wrong-info', label: '❌ Wrong Info',      cls: 'rp-tag-wrong-info', needsTarget: true  },
  { id: 'missing',    label: '📭 Missing Info',    cls: 'rp-tag-missing',    needsTarget: true  },
  { id: 'suggestion', label: '💡 Suggestion',      cls: 'rp-tag-suggestion', needsTarget: false },
  { id: 'error',      label: '⚠️ Other Error',     cls: 'rp-tag-error',      needsTarget: false },
];

var PRIORITIES = [
  { id: 'low',    label: 'Low',    cls: 'rp-pri-low'    },
  { id: 'medium', label: 'Medium', cls: 'rp-pri-medium' },
  { id: 'high',   label: 'High',   cls: 'rp-pri-high'   },
];

var PAGE_SIZE = 10;

// ---- State ----
var RP = {
  user:         null,
  reports:      [],
  filterStatus: 'all',
  filterCat:    'all',
  filterPri:    'all',
  sortBy:       'newest',
  search:       '',
  page:         1,
  selected:     new Set(),
  bulkMode:     false,
  db:           null,
  unsubscribe:  null,
};

// =====================================================
//  Firebase Init
// =====================================================
var firebaseConfig = {
  apiKey:            "AIzaSyDLAhMZnoCVFJwI8yrI6lUxpLCJvi6XMfw",
  authDomain:        "cobblemon-pokedex.firebaseapp.com",
  projectId:         "cobblemon-pokedex",
  storageBucket:     "cobblemon-pokedex.firebasestorage.app",
  messagingSenderId: "759418734744",
  appId:             "1:759418734744:web:6a8a80ae3a5d5219fc28ed",
  measurementId:     "G-GHQCE6BZ1C"
};

function rpInit() {
  var app = document.getElementById('rpApp');
  if (!app) return;

  app.innerHTML = '<div class="rp-loading">⏳ Connecting to database…</div>';

  // Load auth from localStorage (session only, not shared)
  try { RP.user = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch(e) { RP.user = null; }

  // Init Firebase via CDN globals
  try {
    var fbApp = firebase.initializeApp(firebaseConfig);
    RP.db = firebase.firestore();
    rpStartListening();
  } catch(e) {
    if (e.code === 'app/duplicate-app') {
      RP.db = firebase.firestore();
      rpStartListening();
    } else {
      app.innerHTML = '<div class="rp-banned-notice">❌ Could not connect to database: ' + e.message + '</div>';
    }
  }
}

// Real-time listener — updates UI whenever Firestore changes
function rpStartListening() {
  if (RP.unsubscribe) RP.unsubscribe();

  RP.unsubscribe = RP.db.collection('reports')
    .orderBy('createdAt', 'desc')
    .onSnapshot(function(snapshot) {
      RP.reports = [];
      snapshot.forEach(function(doc) {
        RP.reports.push(Object.assign({ id: doc.id }, doc.data()));
      });
      rpRender();
    }, function(err) {
      console.error('Firestore error:', err);
      var app = document.getElementById('rpApp');
      if (app) app.innerHTML = '<div class="rp-banned-notice">❌ Database error: ' + err.message + '</div>';
    });
}

// =====================================================
//  Helpers
// =====================================================
function rpId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

function rpRelTime(ts) {
  if (!ts) return '';
  var ms = ts.toMillis ? ts.toMillis() : ts;
  var diff = Date.now() - ms;
  if (diff < 60000)    return 'just now';
  if (diff < 3600000)  return Math.floor(diff/60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
  return Math.floor(diff/86400000) + 'd ago';
}

function rpTs(r, field) {
  var v = r[field];
  if (!v) return 0;
  return v.toMillis ? v.toMillis() : v;
}

function rpCatObj(id) { return CATEGORIES.find(function(c){ return c.id===id; }) || CATEGORIES[0]; }
function rpPriObj(id) { return PRIORITIES.find(function(p){ return p.id===id; }) || PRIORITIES[0]; }
function rpIsAdmin()  { return RP.user && RP.user.role === 'admin'; }
function rpIsBanned() { return RP.user && RP.user.banned; }
function rpIsUserBanned(u) { var m=rpGetMembers(); return m[u] && m[u].banned; }
function rpFindReport(id)  { return RP.reports.find(function(r){ return r.id===id; }); }

function rpEsc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function rpEscAttr(s) { return String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }

// ---- Toast ----
function rpToast(msg, type) {
  var old = document.getElementById('rpToast');
  if (old) old.remove();
  var el = document.createElement('div');
  el.id = 'rpToast';
  el.className = 'rp-toast ' + (type||'');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function(){
    el.style.opacity='0'; el.style.transition='opacity 0.4s';
    setTimeout(function(){ el.remove(); }, 400);
  }, 2800);
}

// ---- Markdown ----
function rpMarkdown(text) {
  var s = rpEsc(text);
  s = s.replace(/```([\s\S]*?)```/g, '<pre class="rp-md-pre"><code>$1</code></pre>');
  s = s.replace(/`([^`]+)`/g, '<code class="rp-md-code">$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/^[-•] (.+)$/gm, '<li>$1</li>');
  s = s.replace(/(<li>.*<\/li>)/gs, '<ul class="rp-md-ul">$1</ul>');
  s = s.replace(/@(\w+)/g, '<span class="rp-mention">@$1</span>');
  s = s.replace(/\n/g, '<br>');
  return s;
}

// =====================================================
//  Members (localStorage — per-browser session data)
// =====================================================
function rpGetMembers() {
  try { return JSON.parse(localStorage.getItem(MEMBERS_KEY) || '{}'); } catch(e) { return {}; }
}
function rpSaveMembers(m) { localStorage.setItem(MEMBERS_KEY, JSON.stringify(m)); }

// Members are synced to Firestore so bans work across browsers
function rpSyncMemberToFirestore(username, data) {
  if (!RP.db) return;
  RP.db.collection('members').doc(username).set(data, { merge: true });
}
function rpGetMemberFromFirestore(username, cb) {
  if (!RP.db) { cb(null); return; }
  RP.db.collection('members').doc(username).get().then(function(doc) {
    cb(doc.exists ? doc.data() : null);
  }).catch(function(){ cb(null); });
}

// =====================================================
//  Notifications (Firestore)
// =====================================================
function rpAddNotif(username, reportId, type, detail) {
  if (!RP.db || username === ADMIN_USERNAME) return;
  RP.db.collection('notifications').add({
    username:  username,
    reportId:  reportId,
    type:      type,
    detail:    detail || null,
    ts:        firebase.firestore.FieldValue.serverTimestamp(),
    read:      false,
  });
}

function rpGetMyNotifs(cb) {
  if (!RP.db || !RP.user) { cb([]); return; }
  RP.db.collection('notifications')
    .where('username', '==', RP.user.username)
    .orderBy('ts', 'desc')
    .limit(50)
    .get()
    .then(function(snap) {
      var notifs = [];
      snap.forEach(function(doc){ notifs.push(Object.assign({ id: doc.id }, doc.data())); });
      cb(notifs);
    }).catch(function(){ cb([]); });
}

function rpCountUnreadNotifs(cb) {
  if (!RP.db || !RP.user || rpIsAdmin()) { cb(0); return; }
  RP.db.collection('notifications')
    .where('username', '==', RP.user.username)
    .where('read', '==', false)
    .get()
    .then(function(snap){ cb(snap.size); })
    .catch(function(){ cb(0); });
}

function rpMarkNotifsRead() {
  if (!RP.db || !RP.user) return;
  RP.db.collection('notifications')
    .where('username', '==', RP.user.username)
    .where('read', '==', false)
    .get()
    .then(function(snap) {
      var batch = RP.db.batch();
      snap.forEach(function(doc){ batch.update(doc.ref, { read: true }); });
      return batch.commit();
    });
}

// =====================================================
//  Auth
// =====================================================
function rpLogin(username, password, isRegister, cb) {
  username = username.trim();
  if (!username) return cb('Username is required.');
  if (!password)  return cb('Password is required.');
  if (username.length < 3) return cb('Username must be at least 3 characters.');
  if (/[<>"']/.test(username)) return cb('Username contains invalid characters.');

  if (username === ADMIN_USERNAME) {
    if (password !== ADMIN_PASSWORD) return cb('Wrong admin password.');
    RP.user = { username: ADMIN_USERNAME, role: 'admin' };
    localStorage.setItem(AUTH_KEY, JSON.stringify(RP.user));
    return cb(null);
  }

  // Check Firestore for member
  rpGetMemberFromFirestore(username, function(member) {
    if (isRegister) {
      if (member) return cb('Username already taken.');
      if (password.length < 6) return cb('Password must be at least 6 characters.');
      var data = { password: password, banned: false, joinedAt: firebase.firestore.FieldValue.serverTimestamp() };
      rpSyncMemberToFirestore(username, data);
      // Also cache locally
      var local = rpGetMembers();
      local[username] = { password: password, banned: false };
      rpSaveMembers(local);
      RP.user = { username: username, role: 'member', banned: false };
      localStorage.setItem(AUTH_KEY, JSON.stringify(RP.user));
      cb(null);
    } else {
      if (!member) return cb('Account not found. Register first.');
      if (member.password !== password) return cb('Wrong password.');
      if (member.banned) {
        RP.user = { username: username, role: 'member', banned: true };
      } else {
        RP.user = { username: username, role: 'member', banned: false };
      }
      localStorage.setItem(AUTH_KEY, JSON.stringify(RP.user));
      cb(null);
    }
  });
}

function rpLogout() {
  RP.user = null;
  localStorage.removeItem(AUTH_KEY);
  RP.bulkMode = false;
  RP.selected.clear();
  rpRender();
}

// =====================================================
//  Report CRUD — Firestore
// =====================================================
function rpCreateReport(title, category, body, target, priority, cb) {
  if (!title.trim() || !body.trim()) return cb('Title and description are required.');
  var cat = rpCatObj(category);
  if (cat.needsTarget && !target.trim()) return cb('Please specify the Pokémon or Move this relates to.');

  // Duplicate check (client-side against loaded reports)
  var titleLow = title.trim().toLowerCase();
  var dup = RP.reports.find(function(r){ return r.status==='open' && r.title.toLowerCase()===titleLow; });
  if (dup) return cb('DUPLICATE:' + dup.id);

  RP.db.collection('reports').add({
    title:      title.trim(),
    category:   category,
    body:       body.trim(),
    target:     target.trim() || null,
    priority:   priority || 'low',
    author:     RP.user.username,
    status:     'open',
    createdAt:  firebase.firestore.FieldValue.serverTimestamp(),
    comments:   [],
    upvotes:    [],
    denyReason: null,
    acceptNote: null,
    adminNote:  null,
    editedAt:   null,
  }).then(function(){ cb(null); }).catch(function(e){ cb(e.message); });
}

function rpUpdateReport(id, data) {
  if (!RP.db) return;
  RP.db.collection('reports').doc(id).update(data);
}

function rpDeleteReport(id) {
  if (!RP.db) return;
  RP.db.collection('reports').doc(id).delete();
  RP.selected.delete(id);
}

function rpAcceptReport(id, note) {
  var r = rpFindReport(id); if (!r) return;
  rpUpdateReport(id, { status:'accepted', acceptNote: note||null, denyReason: null });
  rpAddNotif(r.author, id, 'accepted', note||null);
}

function rpDenyReport(id, reason) {
  var r = rpFindReport(id); if (!r) return;
  rpUpdateReport(id, { status:'denied', denyReason: reason||'No reason provided.', acceptNote: null });
  rpAddNotif(r.author, id, 'denied', reason||null);
}

function rpReopenReport(id) {
  var r = rpFindReport(id); if (!r) return;
  rpUpdateReport(id, { status:'open', denyReason: null, acceptNote: null });
  rpAddNotif(r.author, id, 'reopened', null);
}

function rpEditReport(id, title, category, body, target, priority) {
  rpUpdateReport(id, {
    title:    title.trim(),
    category: category,
    body:     body.trim(),
    target:   target.trim() || null,
    priority: priority,
    editedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

function rpSetAdminNote(id, note) { rpUpdateReport(id, { adminNote: note.trim()||null }); }
function rpSetPriority(id, pri)   { rpUpdateReport(id, { priority: pri }); }

// ---- Upvotes ----
function rpToggleUpvote(id) {
  if (!RP.user || !RP.db) return;
  var r = rpFindReport(id); if (!r) return;
  var u = RP.user.username;
  var upvotes = r.upvotes || [];
  var newUpvotes = upvotes.indexOf(u) === -1
    ? upvotes.concat([u])
    : upvotes.filter(function(x){ return x !== u; });
  rpUpdateReport(id, { upvotes: newUpvotes });
}

// ---- Comments ----
function rpAddComment(reportId, text) {
  var r = rpFindReport(reportId); if (!r || !text.trim()) return;
  var comment = { id: rpId(), author: RP.user.username, text: text.trim(), createdAt: Date.now() };
  var comments = (r.comments || []).concat([comment]);
  rpUpdateReport(reportId, { comments: comments });

  // Notify @mentions
  var mentions = text.match(/@(\w+)/g) || [];
  mentions.forEach(function(m) {
    var uname = m.slice(1);
    if (uname !== RP.user.username) rpAddNotif(uname, reportId, 'mention', RP.user.username);
  });
  // Notify report author
  if (r.author !== RP.user.username) rpAddNotif(r.author, reportId, 'comment', RP.user.username);
}

function rpDeleteComment(reportId, commentId) {
  var r = rpFindReport(reportId); if (!r) return;
  var comments = (r.comments||[]).filter(function(c){ return c.id !== commentId; });
  rpUpdateReport(reportId, { comments: comments });
}

// ---- Bulk ----
function rpBulkSetStatus(status, reason) {
  RP.selected.forEach(function(id) {
    var r = rpFindReport(id); if (!r) return;
    var data = { status: status };
    if (status === 'denied')   { data.denyReason = reason||'Bulk denied.'; data.acceptNote = null; }
    if (status === 'accepted') { data.acceptNote = reason||null; data.denyReason = null; }
    if (status === 'open')     { data.denyReason = null; data.acceptNote = null; }
    rpUpdateReport(id, data);
    rpAddNotif(r.author, id, status, reason||null);
  });
  RP.selected.clear();
}

function rpBulkDelete() {
  RP.selected.forEach(function(id){ rpDeleteReport(id); });
  RP.selected.clear();
}

// ---- Ban (synced to Firestore) ----
function rpBanUser(username) {
  rpSyncMemberToFirestore(username, { banned: true });
  var local = rpGetMembers();
  if (local[username]) { local[username].banned = true; rpSaveMembers(local); }
  rpToast('🚫 ' + username + ' has been banned.', 'error');
}
function rpUnbanUser(username) {
  rpSyncMemberToFirestore(username, { banned: false });
  var local = rpGetMembers();
  if (local[username]) { local[username].banned = false; rpSaveMembers(local); }
  rpToast('✅ ' + username + ' has been unbanned.', 'success');
}

// =====================================================
//  Filtering & Sorting
// =====================================================
function rpGetFiltered() {
  var list = RP.reports.slice();
  if (RP.filterStatus !== 'all') list = list.filter(function(r){ return r.status === RP.filterStatus; });
  if (RP.filterCat    !== 'all') list = list.filter(function(r){ return r.category === RP.filterCat; });
  if (RP.filterPri    !== 'all') list = list.filter(function(r){ return (r.priority||'low') === RP.filterPri; });
  if (RP.search) {
    var q = RP.search.toLowerCase();
    list = list.filter(function(r){
      return r.title.toLowerCase().indexOf(q) !== -1 ||
             r.body.toLowerCase().indexOf(q) !== -1 ||
             r.author.toLowerCase().indexOf(q) !== -1 ||
             (r.target && r.target.toLowerCase().indexOf(q) !== -1);
    });
  }
  list.sort(function(a, b) {
    if (RP.sortBy === 'newest')   return rpTs(b,'createdAt') - rpTs(a,'createdAt');
    if (RP.sortBy === 'oldest')   return rpTs(a,'createdAt') - rpTs(b,'createdAt');
    if (RP.sortBy === 'votes')    return (b.upvotes||[]).length - (a.upvotes||[]).length;
    if (RP.sortBy === 'comments') return (b.comments||[]).length - (a.comments||[]).length;
    if (RP.sortBy === 'priority') { var po={high:0,medium:1,low:2}; return (po[a.priority]||2)-(po[b.priority]||2); }
    return 0;
  });
  return list;
}

// =====================================================
//  Render
// =====================================================
function rpRender() {
  var app = document.getElementById('rpApp');
  if (!app) return;

  if (!RP.user) { app.innerHTML = rpRenderLanding(); return; }

  // Refresh ban from Firestore on render (async, update on next render)
  if (RP.user.role !== 'admin') {
    rpGetMemberFromFirestore(RP.user.username, function(member) {
      if (member && member.banned !== RP.user.banned) {
        RP.user.banned = member.banned;
        localStorage.setItem(AUTH_KEY, JSON.stringify(RP.user));
        rpRender();
      }
    });
  }

  var filtered  = rpGetFiltered();
  var totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (RP.page > totalPages) RP.page = totalPages;
  var pageItems = filtered.slice((RP.page-1)*PAGE_SIZE, RP.page*PAGE_SIZE);

  var html = '';

  // Header
  html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:0.5rem;">';
  html += '<div><h2 class="rp-page-title">📢 Community Reports</h2><p class="rp-page-sub">Report wrong info, bugs, or suggest improvements. Changes are live for everyone.</p></div>';
  html += '<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">';
  html += '<button class="rp-icon-btn" id="rpBellBtn" onclick="rpOpenNotifs()" title="Notifications">🔔</button>';
  html += rpRenderUserPill();
  if (!rpIsBanned()) html += '<button class="rp-new-btn" onclick="rpOpenCreateModal()">+ New Report</button>';
  html += '</div></div>';

  // Update bell badge async
  rpCountUnreadNotifs(function(n) {
    var btn = document.getElementById('rpBellBtn');
    if (btn) btn.innerHTML = '🔔' + (n > 0 ? '<span class="rp-notif-badge">' + n + '</span>' : '');
  });

  if (rpIsBanned()) html += '<div class="rp-banned-notice">🚫 You have been banned and cannot create reports or comments.</div>';
  if (rpIsAdmin())  html += rpRenderAdminDashboard();

  html += '<div class="rp-controls-row">' + rpRenderFilters() + rpRenderSortBar() + '</div>';
  if (rpIsAdmin()) html += rpRenderBulkToolbar();

  html += '<div class="rp-list" id="rpList">';
  if (pageItems.length === 0) {
    html += '<div class="rp-empty"><div class="rp-empty-icon">📭</div><p class="rp-empty-text">No reports match your filters.</p></div>';
  } else {
    pageItems.forEach(function(r){ html += rpRenderCard(r); });
  }
  html += '</div>';

  if (totalPages > 1) html += rpRenderPagination(totalPages, filtered.length);

  app.innerHTML = html;
}

// ---- Landing ----
function rpRenderLanding() {
  var html = '<h2 class="rp-page-title">📢 Community Reports</h2>';
  html += '<p class="rp-page-sub">Log in or register to submit reports, suggestions, and comments. All reports are shared live with everyone.</p>';
  html += '<div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-top:1.25rem;margin-bottom:2.5rem;">';
  html += '<button class="rp-new-btn" onclick="rpShowLogin()">Log in</button>';
  html += '<button class="rp-btn rp-btn-ghost" onclick="rpShowRegister()">Register</button>';
  html += '</div>';
  html += '<div class="rp-list">';
  if (RP.reports.length === 0) {
    html += '<div class="rp-empty"><div class="rp-empty-icon">📭</div><p class="rp-empty-text">No reports yet. Be the first!</p></div>';
  } else {
    RP.reports.slice(0,8).forEach(function(r){ html += rpRenderCardReadOnly(r); });
  }
  html += '</div>';
  return html;
}

function rpRenderUserPill() {
  var isAdmin = rpIsAdmin();
  return '<div class="rp-user-pill">' +
    '<div class="rp-user-avatar' + (isAdmin?' admin':'') + '">' + RP.user.username.charAt(0).toUpperCase() + '</div>' +
    '<span class="rp-user-name">' + rpEsc(RP.user.username) + '</span>' +
    '<span class="rp-user-role ' + (isAdmin?'rp-role-admin':'rp-role-member') + '">' + (isAdmin?'Admin':'Member') + '</span>' +
    '<button class="rp-logout-btn" onclick="rpLogout()">Logout</button>' +
    '</div>';
}

function rpRenderAdminDashboard() {
  var total    = RP.reports.length;
  var open     = RP.reports.filter(function(r){ return r.status==='open'; }).length;
  var accepted = RP.reports.filter(function(r){ return r.status==='accepted'; }).length;
  var denied   = RP.reports.filter(function(r){ return r.status==='denied'; }).length;
  var high     = RP.reports.filter(function(r){ return r.priority==='high'; }).length;
  var authorCounts = {};
  RP.reports.forEach(function(r){ authorCounts[r.author]=(authorCounts[r.author]||0)+1; });
  var topAuthors = Object.keys(authorCounts).filter(function(a){ return a!==ADMIN_USERNAME; })
    .sort(function(a,b){ return authorCounts[b]-authorCounts[a]; }).slice(0,3);

  var html = '<div class="rp-dashboard">';
  html += '<div class="rp-dash-title">⚡ Admin Overview</div>';
  html += '<div class="rp-dash-stats">';
  html += rpDashStat(total,'Total','') + rpDashStat(open,'Open','rp-dash-open') +
          rpDashStat(accepted,'Accepted','rp-dash-accepted') + rpDashStat(denied,'Denied','rp-dash-denied') +
          rpDashStat(high,'High Pri','rp-dash-high');
  html += '</div>';
  if (topAuthors.length > 0) {
    html += '<div class="rp-dash-active">Most active: ';
    html += topAuthors.map(function(a){ return '<button class="rp-member-link" onclick="rpOpenProfile(\'' + rpEscAttr(a) + '\')">' + rpEsc(a) + ' (' + authorCounts[a] + ')</button>'; }).join(', ');
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function rpDashStat(n, label, cls) {
  return '<div class="rp-dash-stat ' + cls + '"><span class="rp-dash-num">' + n + '</span><span class="rp-dash-label">' + label + '</span></div>';
}

function rpRenderFilters() {
  var statuses = [{id:'all',label:'All'},{id:'open',label:'Open'},{id:'accepted',label:'Accepted'},{id:'denied',label:'Denied'}];
  var html = '<div class="rp-filters">';
  statuses.forEach(function(s){
    html += '<button class="rp-filter-btn' + (RP.filterStatus===s.id?' active':'') + '" onclick="rpSetFilter(\'status\',\'' + s.id + '\')">' + s.label + '</button>';
  });
  html += '<span class="rp-filter-sep"></span>';
  CATEGORIES.forEach(function(c){
    html += '<button class="rp-filter-btn' + (RP.filterCat===c.id?' active':'') + '" onclick="rpSetFilter(\'cat\',\'' + c.id + '\')">' + c.label + '</button>';
  });
  html += '<span class="rp-filter-sep"></span>';
  PRIORITIES.forEach(function(p){
    html += '<button class="rp-filter-btn' + (RP.filterPri===p.id?' active':'') + '" onclick="rpSetFilter(\'pri\',\'' + p.id + '\')">' + p.label + '</button>';
  });
  html += '<input class="rp-filter-search" type="text" placeholder="Search…" value="' + rpEsc(RP.search) + '" oninput="rpSetSearch(this.value)">';
  html += '</div>';
  return html;
}

function rpRenderSortBar() {
  var sorts = [{id:'newest',label:'Newest'},{id:'oldest',label:'Oldest'},{id:'votes',label:'Most Voted'},{id:'comments',label:'Most Comments'},{id:'priority',label:'Priority'}];
  var html = '<div class="rp-sort-bar"><span class="rp-sort-label">Sort:</span>';
  sorts.forEach(function(s){
    html += '<button class="rp-sort-btn' + (RP.sortBy===s.id?' active':'') + '" onclick="rpSetSort(\'' + s.id + '\')">' + s.label + '</button>';
  });
  html += '</div>';
  return html;
}

function rpRenderBulkToolbar() {
  var selCount = RP.selected.size;
  var html = '<div class="rp-bulk-bar">';
  html += '<label class="rp-bulk-toggle"><input type="checkbox" ' + (RP.bulkMode?'checked':'') + ' onchange="rpToggleBulkMode()"> Bulk select</label>';
  if (RP.bulkMode) {
    html += '<span class="rp-bulk-count">' + selCount + ' selected</span>';
    if (selCount > 0) {
      html += '<button class="rp-btn rp-btn-ghost rp-btn-sm" style="border-color:rgba(59,130,246,0.4);color:#93c5fd;" onclick="rpBulkAcceptDo()">✅ Accept all</button>';
      html += '<button class="rp-btn rp-btn-ghost rp-btn-sm" style="border-color:rgba(239,68,68,0.4);color:#f87171;" onclick="rpBulkDenyDo()">⛔ Deny all</button>';
      html += '<button class="rp-btn rp-btn-ghost rp-btn-sm" onclick="rpBulkReopenDo()">🔄 Reopen all</button>';
      html += '<button class="rp-btn rp-btn-danger rp-btn-sm" onclick="rpBulkDeleteDo()">🗑 Delete all</button>';
    }
    html += '<button class="rp-btn rp-btn-ghost rp-btn-sm" onclick="rpSelectAll()">Select page</button>';
    html += '<button class="rp-btn rp-btn-ghost rp-btn-sm" onclick="rpClearSelection()">Clear</button>';
  }
  html += '</div>';
  return html;
}

function rpRenderPagination(totalPages, total) {
  var html = '<div class="rp-pagination"><span class="rp-pag-info">' + total + ' reports · Page ' + RP.page + ' of ' + totalPages + '</span><div class="rp-pag-btns">';
  if (RP.page > 1) html += '<button class="rp-pag-btn" onclick="rpGoPage(' + (RP.page-1) + ')">← Prev</button>';
  for (var p = 1; p <= totalPages; p++) {
    if (totalPages <= 7 || p===1 || p===totalPages || Math.abs(p-RP.page)<=1) {
      html += '<button class="rp-pag-btn' + (p===RP.page?' active':'') + '" onclick="rpGoPage(' + p + ')">' + p + '</button>';
    } else if (Math.abs(p-RP.page)===2) {
      html += '<span class="rp-pag-dots">…</span>';
    }
  }
  if (RP.page < totalPages) html += '<button class="rp-pag-btn" onclick="rpGoPage(' + (RP.page+1) + ')">Next →</button>';
  html += '</div></div>';
  return html;
}

// ---- Card ----
function rpRenderCard(r) {
  var cat = rpCatObj(r.category);
  var pri = rpPriObj(r.priority||'low');
  var isOwn   = RP.user && r.author === RP.user.username;
  var isAdmin = rpIsAdmin();
  var voted   = RP.user && (r.upvotes||[]).indexOf(RP.user.username) !== -1;
  var authorBanned = rpIsUserBanned(r.author);

  var html = '<div class="rp-card" id="card-' + r.id + '">';
  if (RP.bulkMode && isAdmin) {
    html += '<label class="rp-bulk-check"><input type="checkbox" ' + (RP.selected.has(r.id)?'checked':'') + ' onchange="rpToggleSelect(\'' + r.id + '\')" onclick="event.stopPropagation()"></label>';
  }
  html += '<div class="rp-card-header">';
  html += '<button class="rp-upvote-btn' + (voted?' voted':'') + '" id="upvote-' + r.id + '" onclick="rpToggleUpvote(\'' + r.id + '\')" title="Upvote">▲ ' + (r.upvotes||[]).length + '</button>';
  html += '<div class="rp-card-meta">';
  html += '<div class="rp-card-title">' + rpEsc(r.title) + (r.editedAt ? ' <span style="font-size:0.7rem;color:var(--text-dim);font-weight:400;">(edited)</span>' : '') + '</div>';
  html += '<div class="rp-card-info">';
  html += '<span class="rp-tag ' + cat.cls + '">' + cat.label + '</span>';
  html += rpStatusBadge(r.status);
  html += '<span class="rp-pri-badge ' + pri.cls + '">' + pri.label + '</span>';
  if (r.target) html += '<span class="rp-target-badge">🎯 ' + rpEsc(r.target) + '</span>';
  html += '<span>by <button class="rp-member-link" onclick="rpOpenProfile(\'' + rpEscAttr(r.author) + '\')">' + rpEsc(r.author) + '</button>';
  if (authorBanned) html += ' <span class="rp-banned-tag">BANNED</span>';
  html += '</span><span>' + rpRelTime(r.createdAt) + '</span>';
  html += '</div></div></div>';

  html += '<div class="rp-card-body">' + rpMarkdown(r.body) + '</div>';

  if (r.status==='denied'   && r.denyReason) html += '<div class="rp-deny-reason"><strong>⛔ Denied:</strong> '   + rpEsc(r.denyReason) + '</div>';
  if (r.status==='accepted' && r.acceptNote) html += '<div class="rp-accept-note"><strong>✅ Note:</strong> '      + rpEsc(r.acceptNote) + '</div>';
  if (isAdmin && r.adminNote)                html += '<div class="rp-admin-note"><strong>🔒 Admin note:</strong> ' + rpEsc(r.adminNote)  + '</div>';

  html += '<div class="rp-card-actions">';
  html += '<button class="rp-comments-toggle" onclick="rpToggleComments(\'' + r.id + '\')">💬 ' + (r.comments||[]).length + ' comment' + ((r.comments||[]).length!==1?'s':'') + '</button>';
  if (isOwn && !isAdmin) html += '<button class="rp-btn rp-btn-ghost rp-btn-sm" onclick="rpConfirmDeleteReport(\'' + r.id + '\')">🗑 Delete</button>';
  html += '</div>';

  if (isAdmin) {
    html += '<div class="rp-admin-actions">';
    html += '<select class="rp-pri-select" onchange="rpSetPriorityDo(\'' + r.id + '\',this.value)">';
    PRIORITIES.forEach(function(p){ html += '<option value="' + p.id + '"' + ((r.priority||'low')===p.id?' selected':'') + '>' + p.label + ' Priority</option>'; });
    html += '</select>';
    if (r.status!=='accepted') html += '<button class="rp-btn rp-btn-ghost rp-btn-sm" style="border-color:rgba(59,130,246,0.4);color:#93c5fd;" onclick="rpOpenAcceptModal(\'' + r.id + '\')">✅ Accept</button>';
    if (r.status!=='denied')   html += '<button class="rp-btn rp-btn-ghost rp-btn-sm" style="border-color:rgba(239,68,68,0.4);color:#f87171;" onclick="rpOpenDenyModal(\'' + r.id + '\')">⛔ Deny</button>';
    if (r.status!=='open')     html += '<button class="rp-btn rp-btn-ghost rp-btn-sm" onclick="rpReopenDo(\'' + r.id + '\')">🔄 Reopen</button>';
    html += '<button class="rp-btn rp-btn-ghost rp-btn-sm" onclick="rpOpenEditModal(\'' + r.id + '\')">✏️ Edit</button>';
    html += '<button class="rp-btn rp-btn-ghost rp-btn-sm" onclick="rpOpenAdminNoteModal(\'' + r.id + '\')">🔒 Note</button>';
    html += '<button class="rp-btn rp-btn-danger rp-btn-sm" onclick="rpConfirmDeleteReport(\'' + r.id + '\')">🗑 Remove</button>';
    if (r.author !== ADMIN_USERNAME) {
      if (!authorBanned) html += '<button class="rp-btn rp-btn-danger rp-btn-sm" onclick="rpBanDo(\'' + rpEscAttr(r.author) + '\')">🚫 Ban</button>';
      else               html += '<button class="rp-btn rp-btn-ghost rp-btn-sm" onclick="rpUnbanDo(\'' + rpEscAttr(r.author) + '\')">✅ Unban</button>';
    }
    html += '</div>';
  }

  html += '<div class="rp-comments" id="comments-' + r.id + '">' + rpRenderComments(r) + '</div>';
  html += '</div>';
  return html;
}

function rpRenderCardReadOnly(r) {
  var cat = rpCatObj(r.category);
  var html = '<div class="rp-card"><div class="rp-card-header">';
  html += '<div class="rp-upvote-btn disabled">▲ ' + (r.upvotes||[]).length + '</div>';
  html += '<div class="rp-card-meta"><div class="rp-card-title">' + rpEsc(r.title) + '</div>';
  html += '<div class="rp-card-info"><span class="rp-tag ' + cat.cls + '">' + cat.label + '</span>' + rpStatusBadge(r.status);
  if (r.target) html += '<span class="rp-target-badge">🎯 ' + rpEsc(r.target) + '</span>';
  html += '<span>by <strong style="color:var(--text)">' + rpEsc(r.author) + '</strong></span>';
  html += '<span>' + rpRelTime(r.createdAt) + '</span></div></div></div>';
  html += '<div class="rp-card-body">' + rpMarkdown(r.body) + '</div>';
  html += '<p style="font-size:0.8rem;color:var(--text-dim);margin-top:0.25rem;">💬 ' + (r.comments||[]).length + ' comment' + ((r.comments||[]).length!==1?'s':'') + ' · <button onclick="rpShowLogin()" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:0.8rem;padding:0;">Log in to interact</button></p>';
  html += '</div>';
  return html;
}

function rpStatusBadge(status) {
  return { open:'<span class="rp-status rp-status-open">● Open</span>', accepted:'<span class="rp-status rp-status-accepted">✓ Accepted</span>', denied:'<span class="rp-status rp-status-denied">✕ Denied</span>' }[status] || '<span class="rp-status rp-status-open">● Open</span>';
}

function rpRenderComments(r) {
  var html = '';
  var comments = r.comments || [];
  if (comments.length === 0) {
    html += '<p style="font-size:0.8rem;color:var(--text-dim);margin-bottom:0.75rem;">No comments yet.</p>';
  } else {
    comments.forEach(function(c) {
      var isAdminC = c.author === ADMIN_USERNAME;
      var canDel   = rpIsAdmin() || (RP.user && c.author === RP.user.username);
      html += '<div class="rp-comment">';
      html += '<div class="rp-comment-avatar' + (isAdminC?' admin-av':'') + '">' + c.author.charAt(0).toUpperCase() + '</div>';
      html += '<div class="rp-comment-body"><div class="rp-comment-meta">';
      html += '<button class="rp-member-link rp-comment-author' + (isAdminC?' admin-name':'') + '" onclick="rpOpenProfile(\'' + rpEscAttr(c.author) + '\')">' + rpEsc(c.author) + '</button>';
      if (isAdminC) html += ' <span class="rp-user-role rp-role-admin" style="font-size:0.62rem;">Admin</span>';
      html += '<span class="rp-comment-time">' + rpRelTime(c.createdAt) + '</span>';
      if (canDel) html += '<button class="rp-comment-del" onclick="rpDeleteCommentDo(\'' + r.id + '\',\'' + c.id + '\')" title="Delete">✕</button>';
      html += '</div><div class="rp-comment-text">' + rpMarkdown(c.text) + '</div></div></div>';
    });
  }
  if (!rpIsBanned()) {
    html += '<div class="rp-comment-form">';
    html += '<input class="rp-comment-input" type="text" id="cinput-' + r.id + '" placeholder="Write a comment… (@mention supported)" maxlength="500" onkeydown="rpCommentKey(event,\'' + r.id + '\')">';
    html += '<button class="rp-comment-send" onclick="rpSendComment(\'' + r.id + '\')">Send</button>';
    html += '</div>';
  }
  return html;
}

// =====================================================
//  Auth Modals
// =====================================================
function rpShowLogin()    { document.getElementById('rpAuthOverlay').style.display='flex'; document.getElementById('rpAuthContent').innerHTML=rpLoginForm(); }
function rpShowRegister() { document.getElementById('rpAuthOverlay').style.display='flex'; document.getElementById('rpAuthContent').innerHTML=rpRegisterForm(); }
function rpHideAuth()     { document.getElementById('rpAuthOverlay').style.display='none'; }

function rpLoginForm() {
  return '<p class="rp-modal-title">Welcome back</p><p class="rp-modal-sub">Log in to submit reports and comments.</p>' +
    '<div class="rp-field"><label class="rp-label">Username</label><input class="rp-input" id="authUser" type="text" autocomplete="username" placeholder="Your username"></div>' +
    '<div class="rp-field"><label class="rp-label">Password</label><input class="rp-input" id="authPass" type="password" autocomplete="current-password" placeholder="••••••••" onkeydown="if(event.key===\'Enter\')rpDoLogin()"></div>' +
    '<p class="rp-error" id="authErr"></p>' +
    '<button class="rp-btn rp-btn-primary" style="margin-top:0.5rem;" onclick="rpDoLogin()">Log in</button>' +
    '<div class="rp-switch-auth">No account? <button onclick="rpShowRegister()">Register</button></div>' +
    '<div style="text-align:center;margin-top:0.75rem;"><button onclick="rpHideAuth()" style="background:none;border:none;color:var(--text-muted);font-size:0.8rem;cursor:pointer;">Cancel</button></div>';
}
function rpRegisterForm() {
  return '<p class="rp-modal-title">Create account</p><p class="rp-modal-sub">Join the community to submit reports and comments.</p>' +
    '<div class="rp-field"><label class="rp-label">Username</label><input class="rp-input" id="authUser" type="text" autocomplete="username" placeholder="Pick a username (min 3 chars)"></div>' +
    '<div class="rp-field"><label class="rp-label">Password</label><input class="rp-input" id="authPass" type="password" autocomplete="new-password" placeholder="At least 6 characters" onkeydown="if(event.key===\'Enter\')rpDoRegister()"></div>' +
    '<p class="rp-error" id="authErr"></p>' +
    '<button class="rp-btn rp-btn-primary" style="margin-top:0.5rem;" onclick="rpDoRegister()">Register</button>' +
    '<div class="rp-switch-auth">Already have an account? <button onclick="rpShowLogin()">Log in</button></div>' +
    '<div style="text-align:center;margin-top:0.75rem;"><button onclick="rpHideAuth()" style="background:none;border:none;color:var(--text-muted);font-size:0.8rem;cursor:pointer;">Cancel</button></div>';
}

function rpDoLogin() {
  var u = document.getElementById('authUser').value;
  var p = document.getElementById('authPass').value;
  document.getElementById('authErr').style.display = 'none';
  rpLogin(u, p, false, function(err) {
    if (err) { rpShowErr('authErr', err); return; }
    rpHideAuth(); rpRender();
    rpToast('👋 Welcome back, ' + RP.user.username + '!', 'success');
  });
}
function rpDoRegister() {
  var u = document.getElementById('authUser').value;
  var p = document.getElementById('authPass').value;
  document.getElementById('authErr').style.display = 'none';
  rpLogin(u, p, true, function(err) {
    if (err) { rpShowErr('authErr', err); return; }
    rpHideAuth(); rpRender();
    rpToast('✅ Account created! Welcome, ' + RP.user.username + '!', 'success');
  });
}

function rpShowErr(id, msg) {
  var el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

// =====================================================
//  Generic Modal
// =====================================================
function rpCloseModal(e) {
  if (!e || e.target === document.getElementById('rpModalOverlay'))
    document.getElementById('rpModalOverlay').style.display = 'none';
}
function rpOpenModal(html) {
  document.getElementById('rpModalContent').innerHTML = html;
  document.getElementById('rpModalOverlay').style.display = 'flex';
  setTimeout(function(){ var f=document.querySelector('#rpModalContent input,#rpModalContent textarea'); if(f) f.focus(); }, 60);
}

// ---- Create ----
function rpOpenCreateModal() {
  var catOpts = CATEGORIES.map(function(c){ return '<option value="'+c.id+'">'+c.label+'</option>'; }).join('');
  var priOpts = PRIORITIES.map(function(p){ return '<option value="'+p.id+'">'+p.label+' Priority</option>'; }).join('');
  rpOpenModal(
    '<p class="rp-modal-title">New Report</p>' +
    '<p class="rp-modal-sub">Supports **bold**, *italic*, `code`, - lists, @mentions.</p>' +
    '<div class="rp-field"><label class="rp-label">Title</label><input class="rp-input" id="mTitle" maxlength="120" placeholder="Short, clear title…" oninput="rpCheckDuplicate()"></div>' +
    '<div id="mDupWarn" class="rp-dup-warn" style="display:none"></div>' +
    '<div style="display:flex;gap:0.75rem;flex-wrap:wrap;">' +
      '<div class="rp-field" style="flex:2;min-width:140px;"><label class="rp-label">Category</label><select class="rp-input rp-select" id="mCat" onchange="rpToggleTargetField()">' + catOpts + '</select></div>' +
      '<div class="rp-field" style="flex:1;min-width:100px;"><label class="rp-label">Priority</label><select class="rp-input rp-select" id="mPri">' + priOpts + '</select></div>' +
    '</div>' +
    '<div class="rp-field" id="mTargetField" style="display:none;"><label class="rp-label">Pokémon / Move <span style="color:var(--accent)">*</span></label><input class="rp-input" id="mTarget" maxlength="80" placeholder="e.g. Charizard or Flamethrower"></div>' +
    '<div class="rp-field"><label class="rp-label">Description</label><textarea class="rp-input rp-textarea" id="mBody" maxlength="1500" placeholder="Describe the issue in detail…"></textarea></div>' +
    '<p class="rp-error" id="mErr"></p>' +
    '<div class="rp-modal-actions"><button class="rp-btn rp-btn-ghost" onclick="rpCloseModal()">Cancel</button><button class="rp-btn rp-btn-primary" id="mSubmitBtn" onclick="rpDoCreate()">Submit Report</button></div>'
  );
  rpToggleTargetField();
}

function rpToggleTargetField() {
  var cat = document.getElementById('mCat'); var field = document.getElementById('mTargetField');
  if (!cat||!field) return;
  field.style.display = rpCatObj(cat.value).needsTarget ? 'block' : 'none';
}

function rpCheckDuplicate() {
  var title = (document.getElementById('mTitle')||{}).value||'';
  var warn  = document.getElementById('mDupWarn'); if (!warn) return;
  if (!title.trim()) { warn.style.display='none'; return; }
  var dup = RP.reports.find(function(r){ return r.status==='open' && r.title.toLowerCase()===title.trim().toLowerCase(); });
  if (dup) { warn.innerHTML='⚠️ A similar open report already exists: <strong>'+rpEsc(dup.title)+'</strong>'; warn.style.display='block'; }
  else       warn.style.display='none';
}

function rpDoCreate() {
  var title  = document.getElementById('mTitle').value;
  var cat    = document.getElementById('mCat').value;
  var body   = document.getElementById('mBody').value;
  var target = (document.getElementById('mTarget')||{}).value||'';
  var pri    = document.getElementById('mPri').value;
  var btn    = document.getElementById('mSubmitBtn');
  if (btn) { btn.disabled=true; btn.textContent='Submitting…'; }
  rpCreateReport(title, cat, body, target, pri, function(err) {
    if (err) {
      if (btn) { btn.disabled=false; btn.textContent='Submit Report'; }
      if (err.startsWith('DUPLICATE:')) { rpShowErr('mErr','A report with this exact title already exists.'); return; }
      rpShowErr('mErr', err); return;
    }
    rpCloseModal(); rpToast('📢 Report submitted!', 'success');
  });
}

// ---- Edit ----
function rpOpenEditModal(id) {
  var r = rpFindReport(id); if (!r) return;
  var catOpts = CATEGORIES.map(function(c){ return '<option value="'+c.id+'"'+(c.id===r.category?' selected':'')+'>'+c.label+'</option>'; }).join('');
  var priOpts = PRIORITIES.map(function(p){ return '<option value="'+p.id+'"'+((r.priority||'low')===p.id?' selected':'')+'>'+p.label+' Priority</option>'; }).join('');
  rpOpenModal(
    '<p class="rp-modal-title">Edit Report</p>' +
    '<div class="rp-field"><label class="rp-label">Title</label><input class="rp-input" id="mTitle" maxlength="120" value="'+rpEsc(r.title)+'"></div>' +
    '<div style="display:flex;gap:0.75rem;flex-wrap:wrap;">' +
      '<div class="rp-field" style="flex:2;min-width:140px;"><label class="rp-label">Category</label><select class="rp-input rp-select" id="mCat" onchange="rpToggleTargetField()">'+catOpts+'</select></div>' +
      '<div class="rp-field" style="flex:1;min-width:100px;"><label class="rp-label">Priority</label><select class="rp-input rp-select" id="mPri">'+priOpts+'</select></div>' +
    '</div>' +
    '<div class="rp-field" id="mTargetField"><label class="rp-label">Pokémon / Move</label><input class="rp-input" id="mTarget" maxlength="80" value="'+rpEsc(r.target||'')+'"></div>' +
    '<div class="rp-field"><label class="rp-label">Description</label><textarea class="rp-input rp-textarea" id="mBody" maxlength="1500">'+rpEsc(r.body)+'</textarea></div>' +
    '<p class="rp-error" id="mErr"></p>' +
    '<div class="rp-modal-actions"><button class="rp-btn rp-btn-ghost" onclick="rpCloseModal()">Cancel</button><button class="rp-btn rp-btn-primary" onclick="rpDoEdit(\''+id+'\')">Save Changes</button></div>'
  );
}
function rpDoEdit(id) {
  var title=document.getElementById('mTitle').value, cat=document.getElementById('mCat').value,
      body=document.getElementById('mBody').value, target=(document.getElementById('mTarget')||{}).value||'',
      pri=document.getElementById('mPri').value;
  if (!title.trim()||!body.trim()) { rpShowErr('mErr','Title and description required.'); return; }
  rpEditReport(id,title,cat,body,target,pri);
  rpCloseModal(); rpToast('✏️ Report updated.','success');
}

// ---- Accept / Deny / Reopen ----
function rpOpenAcceptModal(id) {
  rpOpenModal('<p class="rp-modal-title">Accept Report</p><p class="rp-modal-sub">Optionally leave a note for the reporter.</p>' +
    '<div class="rp-field"><label class="rp-label">Note (optional)</label><textarea class="rp-input rp-textarea" id="mNote" maxlength="300" style="min-height:70px;"></textarea></div>' +
    '<div class="rp-modal-actions"><button class="rp-btn rp-btn-ghost" onclick="rpCloseModal()">Cancel</button><button class="rp-btn rp-btn-primary" style="background:#3b82f6;" onclick="rpAcceptDo(\''+id+'\')">✅ Accept</button></div>');
}
function rpAcceptDo(id) { rpAcceptReport(id, document.getElementById('mNote').value); rpCloseModal(); rpToast('✅ Report accepted.','success'); }

function rpOpenDenyModal(id) {
  rpOpenModal('<p class="rp-modal-title">Deny Report</p><p class="rp-modal-sub">Provide a reason so the author understands why.</p>' +
    '<div class="rp-field"><label class="rp-label">Reason <span style="color:var(--accent)">*</span></label><textarea class="rp-input rp-textarea" id="mReason" maxlength="300" style="min-height:80px;"></textarea></div>' +
    '<p class="rp-error" id="mErr"></p>' +
    '<div class="rp-modal-actions"><button class="rp-btn rp-btn-ghost" onclick="rpCloseModal()">Cancel</button><button class="rp-btn rp-btn-danger" onclick="rpDenyDo(\''+id+'\')">⛔ Deny</button></div>');
}
function rpDenyDo(id) {
  var r=document.getElementById('mReason').value.trim();
  if (!r) { rpShowErr('mErr','Please provide a reason.'); return; }
  rpDenyReport(id,r); rpCloseModal(); rpToast('⛔ Report denied.','');
}

function rpReopenDo(id) { rpReopenReport(id); rpToast('🔄 Report reopened.','success'); }

// ---- Admin note ----
function rpOpenAdminNoteModal(id) {
  var r=rpFindReport(id); if (!r) return;
  rpOpenModal('<p class="rp-modal-title">🔒 Private Admin Note</p><p class="rp-modal-sub">Only visible to you.</p>' +
    '<div class="rp-field"><textarea class="rp-input rp-textarea" id="mAdminNote" maxlength="500">'+rpEsc(r.adminNote||'')+'</textarea></div>' +
    '<div class="rp-modal-actions"><button class="rp-btn rp-btn-ghost" onclick="rpCloseModal()">Cancel</button><button class="rp-btn rp-btn-primary" onclick="rpSaveAdminNote(\''+id+'\')">Save Note</button></div>');
}
function rpSaveAdminNote(id) { rpSetAdminNote(id,document.getElementById('mAdminNote').value); rpCloseModal(); rpToast('🔒 Note saved.','success'); }

// ---- Delete ----
function rpConfirmDeleteReport(id) {
  var r=rpFindReport(id); if (!r) return;
  rpOpenModal('<p class="rp-modal-title">Delete Report</p><p class="rp-modal-sub" style="color:var(--text);">Delete <strong>"'+rpEsc(r.title)+'"</strong>? Cannot be undone.</p>' +
    '<div class="rp-modal-actions"><button class="rp-btn rp-btn-ghost" onclick="rpCloseModal()">Cancel</button><button class="rp-btn rp-btn-danger" onclick="rpDoDeleteReport(\''+id+'\')">🗑 Delete</button></div>');
}
function rpDoDeleteReport(id) { rpDeleteReport(id); rpCloseModal(); rpToast('🗑 Report deleted.',''); }

// ---- Ban ----
function rpBanDo(username) {
  rpOpenModal('<p class="rp-modal-title">Ban User</p><p class="rp-modal-sub" style="color:var(--text);">Ban <strong>'+rpEsc(username)+'</strong>? They cannot post or comment.</p>' +
    '<div class="rp-modal-actions"><button class="rp-btn rp-btn-ghost" onclick="rpCloseModal()">Cancel</button><button class="rp-btn rp-btn-danger" onclick="rpDoBan(\''+rpEscAttr(username)+'\')">🚫 Ban</button></div>');
}
function rpDoBan(u)   { rpBanUser(u);   rpCloseModal(); rpRender(); }
function rpUnbanDo(u) { rpUnbanUser(u); rpRender(); }

// ---- Bulk ----
function rpToggleBulkMode() { RP.bulkMode=!RP.bulkMode; if (!RP.bulkMode) RP.selected.clear(); rpRender(); }
function rpToggleSelect(id) { if (RP.selected.has(id)) RP.selected.delete(id); else RP.selected.add(id); var c=document.querySelector('.rp-bulk-count'); if(c) c.textContent=RP.selected.size+' selected'; }
function rpSelectAll() { var p=rpGetFiltered().slice((RP.page-1)*PAGE_SIZE,RP.page*PAGE_SIZE); p.forEach(function(r){ RP.selected.add(r.id); }); rpRender(); }
function rpClearSelection() { RP.selected.clear(); rpRender(); }
function rpBulkAcceptDo() {
  rpOpenModal('<p class="rp-modal-title">Accept '+RP.selected.size+' Reports</p><div class="rp-field"><label class="rp-label">Note (optional)</label><textarea class="rp-input rp-textarea" id="mNote" style="min-height:60px;"></textarea></div>' +
    '<div class="rp-modal-actions"><button class="rp-btn rp-btn-ghost" onclick="rpCloseModal()">Cancel</button><button class="rp-btn rp-btn-primary" style="background:#3b82f6;" onclick="rpBulkAcceptConfirm()">✅ Accept All</button></div>');
}
function rpBulkAcceptConfirm() { rpBulkSetStatus('accepted',document.getElementById('mNote').value); rpCloseModal(); rpToast('✅ Reports accepted.','success'); }
function rpBulkDenyDo() {
  rpOpenModal('<p class="rp-modal-title">Deny '+RP.selected.size+' Reports</p><div class="rp-field"><label class="rp-label">Reason <span style="color:var(--accent)">*</span></label><textarea class="rp-input rp-textarea" id="mReason" style="min-height:70px;"></textarea></div>' +
    '<p class="rp-error" id="mErr"></p><div class="rp-modal-actions"><button class="rp-btn rp-btn-ghost" onclick="rpCloseModal()">Cancel</button><button class="rp-btn rp-btn-danger" onclick="rpBulkDenyConfirm()">⛔ Deny All</button></div>');
}
function rpBulkDenyConfirm() { var r=document.getElementById('mReason').value.trim(); if (!r) { rpShowErr('mErr','Please provide a reason.'); return; } rpBulkSetStatus('denied',r); rpCloseModal(); rpToast('⛔ Reports denied.',''); }
function rpBulkReopenDo() { rpBulkSetStatus('open',''); rpToast('🔄 Reports reopened.','success'); }
function rpBulkDeleteDo() {
  rpOpenModal('<p class="rp-modal-title">Delete '+RP.selected.size+' Reports</p><p class="rp-modal-sub" style="color:var(--text);">Permanently delete all '+RP.selected.size+' selected reports?</p>' +
    '<div class="rp-modal-actions"><button class="rp-btn rp-btn-ghost" onclick="rpCloseModal()">Cancel</button><button class="rp-btn rp-btn-danger" onclick="rpBulkDeleteConfirm()">🗑 Delete All</button></div>');
}
function rpBulkDeleteConfirm() { rpBulkDelete(); rpCloseModal(); rpToast('🗑 Reports deleted.',''); }
function rpSetPriorityDo(id,pri) { rpSetPriority(id,pri); rpToast('Priority updated.','success'); }

// =====================================================
//  Notifications Panel
// =====================================================
function rpOpenNotifs() {
  rpMarkNotifsRead();
  var typeMap = { accepted:{icon:'✅',text:'Your report was accepted'}, denied:{icon:'⛔',text:'Your report was denied'}, reopened:{icon:'🔄',text:'Your report was reopened'}, comment:{icon:'💬',text:'commented on your report'}, mention:{icon:'@',text:'mentioned you in a comment'} };
  rpGetMyNotifs(function(notifs) {
    var html = '<p class="rp-modal-title">🔔 Notifications</p>';
    if (notifs.length===0) {
      html += '<p style="color:var(--text-muted);font-size:0.88rem;padding:1rem 0;">No notifications yet.</p>';
    } else {
      html += '<div style="display:flex;flex-direction:column;gap:0.6rem;max-height:380px;overflow-y:auto;padding-right:0.25rem;">';
      notifs.forEach(function(n) {
        var t=typeMap[n.type]||{icon:'ℹ️',text:n.type};
        var r=rpFindReport(n.reportId);
        html += '<div class="rp-notif-item'+(n.read?'':' unread')+'">';
        html += '<span class="rp-notif-icon">'+t.icon+'</span><div class="rp-notif-body"><p class="rp-notif-text">';
        if (n.type==='comment'||n.type==='mention') html += '<strong>'+rpEsc(n.detail)+'</strong> '+t.text;
        else html += t.text;
        if (r) html += ' — <em>'+rpEsc(r.title)+'</em>';
        if (n.detail && n.type!=='comment' && n.type!=='mention') html += '<br><span style="font-size:0.75rem;color:var(--text-dim);">'+rpEsc(n.detail)+'</span>';
        html += '</p><span class="rp-notif-time">'+rpRelTime(n.ts)+'</span></div></div>';
      });
      html += '</div><button class="rp-btn rp-btn-ghost" style="margin-top:1rem;width:100%;justify-content:center;" onclick="rpClearNotifs()">Clear all</button>';
    }
    html += '<div style="text-align:center;margin-top:1rem;"><button onclick="rpCloseModal()" style="background:none;border:none;color:var(--text-muted);font-size:0.8rem;cursor:pointer;">Close</button></div>';
    rpOpenModal(html);
    // Reset bell badge
    var btn=document.getElementById('rpBellBtn'); if(btn) btn.innerHTML='🔔';
  });
}

function rpClearNotifs() {
  if (!RP.db||!RP.user) return;
  RP.db.collection('notifications').where('username','==',RP.user.username).get().then(function(snap){
    var batch=RP.db.batch(); snap.forEach(function(doc){ batch.delete(doc.ref); }); return batch.commit();
  }).then(function(){ rpCloseModal(); rpToast('Notifications cleared.',''); });
}

// =====================================================
//  Member Profile
// =====================================================
function rpOpenProfile(username) {
  var userReports = RP.reports.filter(function(r){ return r.author===username; });
  var accepted    = userReports.filter(function(r){ return r.status==='accepted'; }).length;
  var open        = userReports.filter(function(r){ return r.status==='open'; }).length;
  var totalVotes  = userReports.reduce(function(s,r){ return s+(r.upvotes||[]).length; },0);
  var isAdmin     = rpIsAdmin();

  rpGetMemberFromFirestore(username, function(member) {
    var banned = member && member.banned;
    var html = '<p class="rp-modal-title">👤 '+rpEsc(username)+'</p>';
    if (username===ADMIN_USERNAME) html += '<span class="rp-user-role rp-role-admin" style="margin-bottom:1rem;display:inline-block;">Admin</span>';
    html += '<div class="rp-profile-stats">';
    html += '<div class="rp-profile-stat"><span>'+userReports.length+'</span>Reports</div>';
    html += '<div class="rp-profile-stat"><span>'+accepted+'</span>Accepted</div>';
    html += '<div class="rp-profile-stat"><span>'+open+'</span>Open</div>';
    html += '<div class="rp-profile-stat"><span>'+totalVotes+'</span>Votes</div>';
    html += '</div>';
    if (member && member.joinedAt) html += '<p style="font-size:0.8rem;color:var(--text-dim);margin-bottom:1rem;">Joined '+rpRelTime(member.joinedAt)+'</p>';
    if (banned) html += '<p style="color:#f87171;font-size:0.82rem;margin-bottom:0.75rem;">🚫 This user is banned.</p>';
    if (userReports.length>0) {
      html += '<p class="rp-label" style="margin-bottom:0.5rem;">Recent Reports</p>';
      html += '<div style="display:flex;flex-direction:column;gap:0.4rem;max-height:160px;overflow-y:auto;">';
      userReports.slice(0,5).forEach(function(r){
        html += '<div style="font-size:0.82rem;background:var(--surface2);border-radius:var(--radius-sm);padding:0.4rem 0.6rem;display:flex;justify-content:space-between;gap:0.5rem;">';
        html += '<span style="color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+rpEsc(r.title)+'</span>'+rpStatusBadge(r.status)+'</div>';
      });
      html += '</div>';
    }
    if (isAdmin && username!==ADMIN_USERNAME) {
      html += '<div style="display:flex;gap:0.5rem;margin-top:1.25rem;flex-wrap:wrap;">';
      if (!banned) html += '<button class="rp-btn rp-btn-danger rp-btn-sm" onclick="rpDoBan(\''+rpEscAttr(username)+'\');rpCloseModal();">🚫 Ban User</button>';
      else         html += '<button class="rp-btn rp-btn-ghost rp-btn-sm" onclick="rpUnbanUser(\''+rpEscAttr(username)+'\');rpCloseModal();rpRender();">✅ Unban User</button>';
      html += '</div>';
    }
    html += '<div style="text-align:center;margin-top:1rem;"><button onclick="rpCloseModal()" style="background:none;border:none;color:var(--text-muted);font-size:0.8rem;cursor:pointer;">Close</button></div>';
    rpOpenModal(html);
  });
}

// =====================================================
//  Comments
// =====================================================
function rpToggleComments(id) { var el=document.getElementById('comments-'+id); if(el) el.classList.toggle('open'); }
function rpCommentKey(e,id)   { if(e.key==='Enter') rpSendComment(id); }
function rpSendComment(id) {
  var input=document.getElementById('cinput-'+id); if (!input||!input.value.trim()) return;
  rpAddComment(id,input.value); input.value='';
  // Optimistic UI update — Firestore snapshot will confirm
  var el=document.getElementById('comments-'+id);
  if (el) { var wasOpen=el.classList.contains('open'); var r=rpFindReport(id); if(r){ el.innerHTML=rpRenderComments(r); if(wasOpen) el.classList.add('open'); } }
}
function rpDeleteCommentDo(reportId,commentId) {
  rpDeleteComment(reportId,commentId);
  var el=document.getElementById('comments-'+reportId);
  if (el) { var wasOpen=el.classList.contains('open'); var r=rpFindReport(reportId); if(r){ el.innerHTML=rpRenderComments(r); if(wasOpen) el.classList.add('open'); } }
  rpToast('Comment deleted.','');
}

// =====================================================
//  Filters / Sort / Pagination
// =====================================================
function rpSetFilter(type,val) {
  if (type==='status') RP.filterStatus=val;
  if (type==='cat')    RP.filterCat=val;
  if (type==='pri')    RP.filterPri=val;
  RP.page=1; rpRender();
}
function rpSetSort(val) { RP.sortBy=val; RP.page=1; rpRender(); }
function rpSetSearch(val) {
  RP.search=val; RP.page=1;
  var filtered=rpGetFiltered(); var list=document.getElementById('rpList'); if (!list) return;
  list.innerHTML = filtered.slice(0,PAGE_SIZE).map(rpRenderCard).join('') ||
    '<div class="rp-empty"><div class="rp-empty-icon">📭</div><p class="rp-empty-text">No reports match your filters.</p></div>';
}
function rpGoPage(p) {
  RP.page=p; rpRender();
  window.scrollTo({ top: (document.getElementById('rpApp')||{}).offsetTop-80||0, behavior:'smooth' });
}