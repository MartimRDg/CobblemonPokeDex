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
      abilitiesRes.ok  ? abilitiesRes.json()  : Promise.resolve({ abilities: {} }),
      gamesRes.ok      ? gamesRes.json()       : Promise.resolve({ games: [] }),
    ]);

    State.allPokemon   = pokeData.pokemon || [];
    State.allMoves     = movesData.moves || {};
    State.allAbilities = abilitiesData.abilities || {};
    State.allGames     = gamesData.games || [];
    window._allMoves   = State.allMoves;

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
  document.querySelectorAll('video').forEach(function(v) {
    v.muted = true;
    v.play().catch(function() {});
  });
}


// ====================== Index Page ======================
function buildFilters() {
  const types = [...new Set(State.allPokemon.flatMap(function(p) { return p.types || []; }))].sort();
  const gens  = [...new Set(State.allPokemon.map(function(p) { return p.generation; }).filter(Boolean))].sort(function(a,b){ return a-b; });

  const typeSelect = document.getElementById('typeFilter');
  const genSelect  = document.getElementById('genFilter');

  if (typeSelect) {
    types.forEach(function(t) {
      var opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      typeSelect.appendChild(opt);
    });
  }

  if (genSelect) {
    gens.forEach(function(g) {
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

  var start   = (State.currentPage - 1) * State.pageSize;
  var end     = start + State.pageSize;
  var page    = pokemonList.slice(start, end);

  grid.innerHTML = page.map(function(poke) {
    var typeBadges = (poke.types || [])
      .map(function(t) { return '<span class="type-badge type-' + t.toLowerCase() + '">' + t + '</span>'; })
      .join('');
    var num = poke.number || String(poke.id).padStart(4, '0');
    return (
      '<div class="pokemon-card" role="button" tabindex="0"' +
           ' onclick="location.href=\'pokemon.html?id=' + poke.id + '\'"' +
           ' onkeydown="if(event.key===\'Enter\') location.href=\'pokemon.html?id=' + poke.id + '\'">' +
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
  var end   = Math.min(State.currentPage * State.pageSize, total);

  el.innerHTML =
    '<div class="pagination">' +
      '<button class="page-btn" onclick="changePage(-1)"' + (State.currentPage === 1 ? ' disabled' : '') + '>← Prev</button>' +
      '<span class="page-info">' + start + '–' + end + ' of ' + total + '</span>' +
      '<button class="page-btn" onclick="changePage(1)"' + (State.currentPage === totalPages ? ' disabled' : '') + '>Next →</button>' +
    '</div>';
}

window.changePage = function(dir) {
  var totalPages = Math.ceil(_filteredList.length / State.pageSize);
  State.currentPage = Math.max(1, Math.min(State.currentPage + dir, totalPages));
  renderGrid(_filteredList);
  window.scrollTo({ top: document.getElementById('pokemonGrid').offsetTop - 80, behavior: 'smooth' });
};

function renderCompletion() {
  var el = document.getElementById('completionBar');
  if (!el) return;
  var total   = State.allPokemon.length;
  var max     = 1025;
  var pct     = Math.min((total / max) * 100, 100).toFixed(1);
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
  var today    = new Date();
  var seed     = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  var index    = seed % State.allPokemon.length;
  var poke     = State.allPokemon[index];
  var sprite   = poke.video || poke.sprite;
  var num      = poke.number || String(poke.id).padStart(4, '0');
  var total    = poke.baseStats ? Object.values(poke.baseStats).reduce(function(t, v) { return t + v; }, 0) : 0;
  var types    = (poke.types || []).map(function(t) {
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
  var grid    = document.getElementById('recentGrid');
  if (!section || !grid) return;

  var ids = [];
  try { ids = JSON.parse(localStorage.getItem('recentPokemon') || '[]'); } catch(e) {}

  var recent = ids.map(function(id) {
    return State.allPokemon.find(function(p) { return p.id === id; });
  }).filter(Boolean);

  if (!recent.length) { section.style.display = 'none'; return; }
  section.style.display = 'block';

  grid.innerHTML = recent.map(function(poke) {
    var sprite = poke.video || poke.sprite;
    var num    = poke.number || String(poke.id).padStart(4, '0');
    var types  = (poke.types || []).map(function(t) {
      return '<span class="type-badge type-' + t.toLowerCase() + ' type-xs">' + t + '</span>';
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

  var ranked = State.allPokemon.slice().sort(function(a, b) {
    var sumA = a.baseStats ? Object.values(a.baseStats).reduce(function(t, v) { return t + v; }, 0) : 0;
    var sumB = b.baseStats ? Object.values(b.baseStats).reduce(function(t, v) { return t + v; }, 0) : 0;
    return sumB - sumA;
  }).slice(0, 5);

  grid.innerHTML = ranked.map(function(poke, i) {
    var total = poke.baseStats ? Object.values(poke.baseStats).reduce(function(t, v) { return t + v; }, 0) : 0;
    var num   = poke.number || String(poke.id).padStart(4, '0');
    var medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    return (
      '<div class="top5-card">' +
        '<div class="top5-rank">' + medals[i] + '</div>' +
        '<div class="top5-sprite-wrap">' +
          buildSpriteEl(poke.video || poke.sprite, poke.name, 'top5-sprite', 'assets/images/placeholder.png') +
        '</div>' +
        '<div class="top5-info">' +
          '<p class="top5-number">#' + num + '</p>' +
          '<h3 class="top5-name">' + poke.name + '</h3>' +
          '<p class="top5-total">' + total + ' BST</p>' +
        '</div>' +
        '<a href="pokemon.html?id=' + poke.id + '" class="top5-btn">View</a>' +
      '</div>'
    );
  }).join('');
}

function filterPokemon() {
  var search     = (document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase().trim() : '');
  var typeFilter = (document.getElementById('typeFilter') ? document.getElementById('typeFilter').value : '');
  var genFilter  = (document.getElementById('genFilter')  ? document.getElementById('genFilter').value  : '');

  var filtered = State.allPokemon.filter(function(p) {
    var matchSearch = p.name.toLowerCase().includes(search) ||
                      String(p.id).includes(search) ||
                      (p.number || '').includes(search);
    var matchType = !typeFilter || (p.types || []).includes(typeFilter);
    var matchGen  = !genFilter  || String(p.generation) === genFilter;
    return matchSearch && matchType && matchGen;
  });

  renderGrid(filtered, true);
}


// ====================== Detail Page ======================
function getPokemonById(id) {
  return State.allPokemon.find(function(p) { return p.id === id; }) || null;
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

function animateStatBars(container) {
  var fills = (container || document).querySelectorAll('.stat-bar-anim');
  var values = (container || document).querySelectorAll('.stat-value-anim');
  if (!fills.length) return;

  function runAnimation() {
    var delay = 0;
    fills.forEach(function(bar, i) {
      var target = parseFloat(bar.getAttribute('data-width'));
      var valueEl = values[i];
      var targetVal = parseInt(valueEl ? valueEl.getAttribute('data-target') : 0, 10);
      setTimeout(function() {
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
    fills.forEach(function(bar) { bar.classList.remove('stat-bar-anim'); });
    values.forEach(function(v) { v.classList.remove('stat-value-anim'); });
  }

  var section = fills[0].closest('.detail-section') || fills[0].closest('section') || fills[0];
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          runAnimation();
          observer.disconnect();
        }
      });
    }, { threshold: 0.25 });
    observer.observe(section);
  } else {
    setTimeout(runAnimation, 100);
  }
}

function buildTypeBadges(types, size) {
  size = size || '';
  return (types || [])
    .map(function(t) { return '<span class="type-badge type-' + t.toLowerCase() + ' ' + size + '">' + t + '</span>'; })
    .join('');
}

function buildDrops(drops) {
  if (!drops || !drops.length) return '<p class="text-gray-500 text-sm">No drops data</p>';
  return drops.map(function(drop) {
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
function buildEvolutionSection(poke) {
  if (!poke.evolutions || !poke.evolutions.length) return '';

  var stages = poke.evolutions.map(function(evo, i) {
    var evoPoke = getPokemonById(evo.id);
    var sprite  = evoPoke ? (evoPoke.video || evoPoke.sprite) : null;
    var isCurrent = evo.id === poke.id;

    var arrow = i > 0
      ? '<div class="evo-arrow">' +
          '<div class="evo-arrow-line"></div>' +
          '<span class="evo-arrow-label">' + (evo.level ? 'Lv. ' + evo.level : evo.method || '?') + '</span>' +
          '<div class="evo-arrow-tip">▶</div>' +
        '</div>'
      : '';

    var spriteEl = sprite
      ? buildSpriteEl(sprite, evo.name, 'evo-sprite', 'assets/images/placeholder.png')
      : '<div class="evo-sprite-placeholder">?</div>';

    return (
      arrow +
      '<a href="pokemon.html?id=' + evo.id + '" class="evo-card' + (isCurrent ? ' evo-current' : '') + '">' +
        '<div class="evo-sprite-wrap">' + spriteEl + '</div>' +
        '<p class="evo-name">' + evo.name + '</p>' +
        '<p class="evo-number">#' + String(evo.id).padStart(4, '0') + '</p>' +
      '</a>'
    );
  }).join('');

  return (
    '<section class="detail-section">' +
      '<h2 class="section-title">Evolution Chart</h2>' +
      '<div class="evo-chain">' + stages + '</div>' +
    '</section>'
  );
}


function buildRangeBar(stat) {
  if (!stat) return '';
  var min = Math.min(stat.min, stat.max);
  var max = Math.max(stat.min, stat.max);
  var leftPct  = min;
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
    jump:         'Jump',
    skill:        'Skill',
    speed:        'Speed',
    stamina:      'Stamina',
  };

  var rows = Object.entries(labels).map(function(entry) {
    var key   = entry[0];
    var label = entry[1];
    var stat  = stats[key];
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

  var icon = title === 'Air Mount'
    ? '<img src="assets/images/air_mount.png" alt="Air Mount" class="mount-icon">'
    : '<img src="assets/images/ground_mount.png" alt="Ground Mount" class="mount-icon">';

  return (
    '<div class="mount-card">' +
      '<h3 class="mount-card-title">' + icon + ' ' + title + '</h3>' +
      '<div class="ride-stats">' + rows + '</div>' +
    '</div>'
  );
}

function buildRidingSection(poke) {
  if (!poke.rideable) return '';

  var hasAir = poke.flying && poke.riding && poke.riding.air;
  var ground = buildMountCard('Ground Mount', poke.riding ? poke.riding.ground : null);
  var air    = hasAir ? buildMountCard('Air Mount', poke.riding.air) : '';

  return (
    '<section class="detail-section riding-section">' +
      '<h2 class="section-title">How to ride ' + poke.name + '</h2>' +
      '<p class="section-subtitle">Mount stats scale with level and show the possible range</p>' +
      '<div class="mount-grid">' +
        ground +
        air +
      '</div>' +
    '</section>'
  );
}


// ====================== Decks Section ======================
function resolveFormVideo(poke, version) {
  var v = version || 'Normal';
  if (v === 'Normal') return poke.video || null;
  if (v === 'Shiny')  return poke.shinyVideo || null;
  var megas = poke.megaEvolutions || [];
  for (var i = 0; i < megas.length; i++) {
    if (v === megas[i].name)           return megas[i].video || null;
    if (v === megas[i].name + ' Shiny') return megas[i].shinyVideo || null;
  }
  return null;
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

  // Mega / Gigantamax forms
  var megas = poke.megaEvolutions || [];
  for (var i = 0; i < megas.length; i++) {
    var mega = megas[i];
    if (v === mega.name) {
      return mega.sprite;
    }
    if (v === mega.name + ' Shiny') {
      return mega.shinySprite || mega.sprite;
    }
  }

  return poke.sprite;
}

function buildDecksSection(poke) {
  if (!poke.decks || !poke.decks.length) return '';

  // Max possible power for 4 moves (4 x 150 = 600)
  var MAX_DECK_POWER = 600;

  var cards = poke.decks.map(function(deck) {
    var sprite = resolveFormSprite(poke, deck.version);
    var logoPath = deck.logo || '';    // Calculate deck strength
    var totalPower = (deck.moves || []).reduce(function(sum, moveName) {
      var move = window._allMoves ? window._allMoves[moveName] : null;
      return sum + (parseInt(move && move.power) || 0);
    }, 0);
    var strengthPct = Math.min((totalPower / MAX_DECK_POWER) * 100, 100).toFixed(1);
    var strengthColor = totalPower >= 400 ? '#4ade80' : totalPower >= 250 ? '#facc15' : '#f87171';

    var movesList = (deck.moves || []).map(function(moveName) {
      var move = window._allMoves ? window._allMoves[moveName] : null;
      var typeClass = move ? 'type-' + move.type.toLowerCase() : '';
      var typeLabel = move ? move.type : '';
      var power    = move && move.power && move.power !== '-' ? move.power : '—';
      var accuracy = move && move.accuracy ? move.accuracy : '—';
      var pp       = move && move.pp ? move.pp : '—';
      var category = move && move.category ? move.category : '—';

      return (
        '<div class="deck-move">' +
          '<div class="deck-move-top">' +
            '<span class="deck-move-name">' + moveName + '</span>' +
            (typeLabel ? '<span class="type-badge ' + typeClass + ' type-xs">' + typeLabel + '</span>' : '') +
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
          buildSpriteEl(resolveFormVideo(poke, deck.version) || resolveFormSprite(poke, deck.version), deck.version, 'deck-sprite', 'assets/images/placeholder.png') +
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
  var rate  = poke.catchRate;
  var pct   = ((rate / 255) * 100).toFixed(1);
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
  var rows = Object.entries(poke.evYield).map(function(e) {
    return (
      '<div class="ev-row">' +
        '<span class="ev-stat">' + (statLabels[e[0]] || e[0]) + '</span>' +
        '<span class="ev-value">+' + e[1] + '</span>' +
      '</div>'
    );
  }).join('');
  return (
    '<div class="meta-card pokedex-data-card">' +
      '<h3 class="meta-title">EV Yield</h3>' +
      '<div class="ev-list">' + rows + '</div>' +
    '</div>'
  );
}

function buildHeldItems(poke) {
  if (!poke.heldItems || !poke.heldItems.length) return '';
  var rows = poke.heldItems.map(function(item) {
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

  var id   = parseInt(new URLSearchParams(window.location.search).get('id'));
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

  var statsHTML = poke.baseStats
    ? Object.entries(poke.baseStats).map(function(e) { return buildStatBar(e[0], e[1]); }).join('')
    : '<p class="text-yellow-400 text-sm">No stats available</p>';

  var biomeHTML = (poke.spawnBiomes || []).map(function(b) {
    return '<span class="biome-tag">' + b + '</span>';
  }).join('') || '<span class="text-gray-500 text-sm">Unknown</span>';

  var typeBadgesLg = buildTypeBadges(poke.types, 'type-lg');

  var shinyBtn = poke.shinySprite
    ? '<button id="shinyBtn" onclick="toggleShiny()" class="shiny-btn" title="Toggle Shiny">&#10024; <span id="shinyLabel">SHINY</span></button>'
    : '';

  var abilitiesHTML = (poke.abilities || []).map(function(a) {
    var cleanName = a.replace(' (Hidden)', '').trim();
    var isHidden  = a.indexOf('(Hidden)') !== -1;
    var desc = State.allAbilities[cleanName] ? State.allAbilities[cleanName].description : '';
    return (
      '<div class="meta-tag ability-tag' + (isHidden ? ' ability-hidden' : '') + '"' +
           (desc ? ' data-tooltip="' + desc.replace(/"/g, '&quot;') + '"' : '') + '>' +
        a +
        (desc ? '<div class="ability-tooltip">' + desc + '</div>' : '') +
      '</div>'
    );
  }).join('');

  var weakHTML      = buildTypeBadges(poke.weaknesses);
  var resistHTML    = buildTypeBadges(poke.resistances);
  var immunityHTML  = (poke.immunities || ['None']).map(function(i) {
    return i === 'None'
      ? '<span class="immunity-none">None</span>'
      : buildTypeBadges([i]);
  }).join('');

  var moveTabs = ['Level Up', 'TM', 'Egg', 'Tutor'].map(function(label, i) {
    return (
      '<button class="move-tab ' + (i === 0 ? 'active' : '') + '"' +
              ' role="tab" aria-selected="' + (i === 0) + '"' +
              ' onclick="switchMoveTab(' + i + ')">' + label + '</button>'
    );
  }).join('');

  var megaButtons = '';
  if (poke.megaEvolutions && poke.megaEvolutions.length > 0) {
    megaButtons = '<div class="form-btns">' +
      '<button class="form-btn active" onclick="switchForm(0)">Normal</button>' +
      poke.megaEvolutions.map(function(mega, i) {
        return '<button class="form-btn" onclick="switchForm(' + (i + 1) + ')">' + mega.name + '</button>';
      }).join('') +
    '</div>';
  }

  container.innerHTML =
    '<div class="detail-wrapper">' +

      '<div class="detail-hero">' +
        '<div class="sprite-container">' +
          '<div class="sprite-wrap">' +
          buildSpriteEl(poke.video || poke.sprite, poke.name, 'detail-sprite', 'assets/images/placeholder.png') +
          shinyBtn +
        '</div>' +
          megaButtons +
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
              '<div class="meta-tag">Gen ' + (poke.generation || '?') + '</div>' +
            '</div>' +
            '<div class="meta-card">' +
              '<h3 class="meta-title">Dropped Items</h3>' +
              buildDrops(poke.drops) +
            '</div>' +
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

      '<section class="detail-section">' +
        '<h2 class="section-title">Spawn Info</h2>' +
        '<p class="section-subtitle">' + (poke.spawnBiomes || []).length + ' biome(s) where ' + poke.name + ' can appear</p>' +
        '<div class="spawn-grid">' +
          '<div class="meta-card">' +
            '<h3 class="meta-title">Details</h3>' +
            '<table class="spawn-table">' +
              '<tr><td>Bucket</td><td>' + (poke.spawnBucket || '\u2014') + '</td></tr>' +
              '<tr><td>Level</td><td>'  + (poke.spawnLevel  || '\u2014') + '</td></tr>' +
              '<tr><td>Context</td><td>' + (poke.spawnContext || 'Natural') + '</td></tr>' +
              '<tr><td>Preset</td><td>' + (poke.spawnPreset  || '\u2014') + '</td></tr>' +
              '<tr><td>Raining</td><td>' + (poke.isRaining ? 'Yes' : 'No') + '</td></tr>' +
            '</table>' +
          '</div>' +
          '<div class="meta-card biome-card">' +
            '<h3 class="meta-title">Biomes</h3>' +
            '<div class="biome-tags">' + biomeHTML + '</div>' +
          '</div>' +
        '</div>' +
      '</section>' +

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

  window._shinyData = { poke: poke, isShiny: false, formIndex: 0 };

  // Track recently viewed
  try {
    var history = JSON.parse(localStorage.getItem('recentPokemon') || '[]');
    history = history.filter(function(id) { return id !== poke.id; });
    history.unshift(poke.id);
    localStorage.setItem('recentPokemon', JSON.stringify(history.slice(0, 5)));
  } catch(e) {}

  animateStatBars(container);
  // Scroll-reveal for each section
  container.querySelectorAll('.detail-section').forEach(function(sec, i) {
    sec.classList.add('scroll-reveal');
    sec.style.transitionDelay = (i * 0.07) + 's';
  });
  observeNewRevealTargets(container);
  staggerBiomeTags(container);
  renderMoves(poke);
}

window.switchForm = function(index) {
  var d = window._shinyData;
  if (!d) return;
  d.formIndex = index;
  d.isShiny   = false;

  var form = index === 0
    ? {
        sprite: d.poke.sprite,
        shinySprite: d.poke.shinySprite,
        abilities: d.poke.abilities,
        types: d.poke.types,
        weaknesses: d.poke.weaknesses,
        resistances: d.poke.resistances,
        immunities: d.poke.immunities,
      }
    : d.poke.megaEvolutions[index - 1];

  // Sprite — swap video or image
  var spriteWrap = document.querySelector('.sprite-wrap');
  if (spriteWrap) {
    var newSrc = resolveFormVideo(d.poke, form.name || (index === 0 ? 'Normal' : '')) || form.sprite;
    var existing = spriteWrap.querySelector('video, img');
    if (existing) existing.remove();
    spriteWrap.insertAdjacentHTML('afterbegin', buildSpriteEl(newSrc, d.poke.name, 'detail-sprite', 'assets/images/placeholder.png'));
  }
  var btn   = document.getElementById('shinyBtn');
  var label = document.getElementById('shinyLabel');
  if (btn) { btn.classList.remove('active'); btn.style.display = form.shinySprite ? '' : 'none'; }
  if (label) label.textContent = 'SHINY';

  // Abilities
  var abilitiesEl = document.getElementById('pokemonAbilities');
  if (abilitiesEl && form.abilities) {
    abilitiesEl.innerHTML = form.abilities.map(function(a) {
      var cleanName = a.replace(' (Hidden)', '').trim();
      var isHidden  = a.indexOf('(Hidden)') !== -1;
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
    immunEl.innerHTML = (form.immunities).map(function(i) {
      return i === 'None'
        ? '<span class="immunity-none">None</span>'
        : buildTypeBadges([i]);
    }).join('');
  }

  // Active form tab
  document.querySelectorAll('.form-btn').forEach(function(b, i) {
    b.classList.toggle('active', i === index);
  });
};


// ====================== Moves ======================
function renderMoves(poke, filtered) {
  var content = document.getElementById('movesContent');
  if (!content) return;

  var keys  = ['level', 'tm', 'egg', 'tutor'];
  var moves = filtered !== undefined ? filtered : ((poke.moves || {})[keys[State.currentMoveTab]] || []).map(enrichMove);

  if (moves.length === 0) {
    content.innerHTML = '<p class="moves-empty">No moves match your search.</p>';
    return;
  }

  if (State.currentMoveTab !== 0) {
    moves = moves.slice().sort(function(a, b) { return (parseInt(b.power) || 0) - (parseInt(a.power) || 0); });
  }

  var categoryColors = { Physical: '#f87171', Special: '#818cf8', Status: '#4ade80' };
  var isLevelTab = State.currentMoveTab === 0;

  var rows = moves.map(function(m) {
    var typeCell = m.type
      ? '<span class="type-badge type-' + m.type.toLowerCase() + ' type-xs">' + m.type + '</span>'
      : '\u2014';
    var catColor = categoryColors[m.category] || '#9ca3af';
    var catCell  = m.category
      ? '<span class="move-category-badge" style="background:' + catColor + '20;border-color:' + catColor + ';color:' + catColor + '">' + m.category + '</span>'
      : '\u2014';
    return (
      '<tr>' +
        (isLevelTab ? '<td class="move-level">' + (m.level || '\u2014') + '</td>' : '') +
        '<td class="move-name"><a href="move.html?name=' + encodeURIComponent(m.name) + '&from=' + encodeURIComponent(window.location.href) + '" class="move-link">' + m.name + '</a></td>' +
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

window.filterMoves = function() {
  var id   = parseInt(new URLSearchParams(window.location.search).get('id'));
  var poke = getPokemonById(id);
  if (!poke) return;

  var search   = (document.getElementById('moveSearch') ? document.getElementById('moveSearch').value.toLowerCase().trim() : '');
  var category = (document.getElementById('moveCategoryFilter') ? document.getElementById('moveCategoryFilter').value : '');
  var power    = (document.getElementById('movePowerFilter') ? document.getElementById('movePowerFilter').value : '');

  var keys  = ['level', 'tm', 'egg', 'tutor'];
  var moves = ((poke.moves || {})[keys[State.currentMoveTab]] || []).map(enrichMove);

  var filtered = moves.filter(function(m) {
    var matchName = !search || m.name.toLowerCase().includes(search);
    var matchCat  = !category || m.category === category;
    var matchPow  = true;
    if (power === 'status') {
      matchPow = !m.power || m.power === '-';
    } else if (power) {
      var parts = power.split('-');
      var min = parseInt(parts[0]);
      var max = parseInt(parts[1]);
      var p   = parseInt(m.power) || 0;
      matchPow = p >= min && p <= max;
    }
    return matchName && matchCat && matchPow;
  });

  renderMoves(poke, filtered);
};

window.switchMoveTab = function(index) {
  State.currentMoveTab = index;
  document.querySelectorAll('.move-tab').forEach(function(btn, i) {
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
  var id   = parseInt(new URLSearchParams(window.location.search).get('id'));
  var poke = getPokemonById(id);
  if (poke) renderMoves(poke);
};

window.toggleShiny = function() {
  var d = window._shinyData;
  if (!d || !d.poke) return;

  var form = d.formIndex === 0
    ? { sprite: d.poke.sprite, shinySprite: d.poke.shinySprite, shinyVideo: d.poke.shinyVideo }
    : d.poke.megaEvolutions[d.formIndex - 1];

  if (!form.shinySprite && !form.shinyVideo) return;
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

  var btn   = document.getElementById('shinyBtn');
  var label = document.getElementById('shinyLabel');
  if (btn)   btn.classList.toggle('active', d.isShiny);
  if (label) label.textContent = d.isShiny ? 'NORMAL' : 'SHINY';
};


// ====================== Move Detail Page ======================
function loadMoveDetail() {
  var container = document.getElementById('moveDetail');
  if (!container) return;

  var params   = new URLSearchParams(window.location.search);
  var moveName = decodeURIComponent(params.get('name') || '');
  var fromUrl  = decodeURIComponent(params.get('from') || 'index.html');

  // Update back link
  var backLink = document.getElementById('backLink');
  if (backLink) backLink.href = fromUrl;

  var move = State.allMoves[moveName];
  if (!move) {
    container.innerHTML = '<div class="error-state"><div class="text-4xl mb-3">❓</div><p class="text-red-400 text-lg">Move not found: ' + moveName + '</p></div>';
    return;
  }

  document.title = moveName + ' — Cobblemon Pokédex';

  // Find all pokemon that learn this move
  var learnedBy = { level: [], tm: [], egg: [], tutor: [] };
  State.allPokemon.forEach(function(poke) {
    if (!poke.moves) return;
    ['level', 'tm', 'egg', 'tutor'].forEach(function(method) {
      var found = (poke.moves[method] || []).find(function(m) { return m.name === moveName; });
      if (found) learnedBy[method].push({ poke: poke, level: found.level });
    });
  });

  var categoryColors = { Physical: '#f87171', Special: '#818cf8', Status: '#4ade80' };
  var catColor = categoryColors[move.category] || '#9ca3af';

  var statBlocks = [
    { label: 'Power',    value: move.power    || '—' },
    { label: 'Accuracy', value: move.accuracy ? move.accuracy + '%' : '—' },
    { label: 'PP',       value: move.pp       || '—' },
  ].map(function(s) {
    return (
      '<div class="move-stat-block">' +
        '<p class="move-stat-value">' + s.value + '</p>' +
        '<p class="move-stat-label">' + s.label + '</p>' +
      '</div>'
    );
  }).join('');

  var moveTabs = ['Level Up', 'TM', 'Egg', 'Tutor'].map(function(label, i) {
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
              '<span class="type-badge type-' + (move.type || 'normal').toLowerCase() + ' type-lg">' + (move.type || '—') + '</span>' +
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
  container.querySelectorAll('.detail-section').forEach(function(sec, i) {
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

  var rows = entries.map(function(entry) {
    var poke   = entry.poke;
    var sprite = poke.video || poke.sprite;
    var num    = poke.number || String(poke.id).padStart(4, '0');
    var types  = (poke.types || []).map(function(t) {
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

window.switchMoveLearnerTab = function(index) {
  window._currentMoveLearnerTab = index;
  document.querySelectorAll('.move-tab').forEach(function(btn, i) {
    btn.classList.toggle('active', i === index);
    btn.setAttribute('aria-selected', i === index);
  });
  renderMoveLearners();
};


// ====================== Ability Detail Page ======================
function loadAbilityDetail() {
  var container = document.getElementById('abilityDetail');
  if (!container) return;

  var params      = new URLSearchParams(window.location.search);
  var abilityName = decodeURIComponent(params.get('name') || '');
  var fromUrl     = decodeURIComponent(params.get('from') || 'index.html');

  var backLink = document.getElementById('backLink');
  if (backLink) backLink.href = fromUrl;

  var ability = State.allAbilities[abilityName];

  document.title = abilityName + ' — Cobblemon Pokédex';

  var regular = [];
  var hidden  = [];

  State.allPokemon.forEach(function(poke) {
    (poke.abilities || []).forEach(function(a) {
      var isHidden  = a.indexOf('(Hidden)') !== -1;
      var cleanName = a.replace(' (Hidden)', '').trim();
      if (cleanName === abilityName) {
        if (isHidden) hidden.push(poke);
        else regular.push(poke);
      }
    });
  });

  var tabs = [
    { label: 'Regular', list: regular },
    { label: 'Hidden',  list: hidden  },
  ];

  var moveTabs = tabs.map(function(t, i) {
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

  window._abilityTabData    = tabs;
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

  var rows = list.map(function(poke) {
    var sprite = poke.video || poke.sprite;
    var num    = poke.number || String(poke.id).padStart(4, '0');
    var types  = (poke.types || []).map(function(t) {
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

window.switchAbilityTab = function(index) {
  window._currentAbilityTab = index;
  document.querySelectorAll('.move-tab').forEach(function(btn, i) {
    btn.classList.toggle('active', i === index);
  });
  renderAbilityPokemon();
};


function showLoadingState() {
  var grid   = document.getElementById('pokemonGrid');
  var detail = document.getElementById('pokemonDetail');
  if (grid) {
    grid.innerHTML = Array(12).fill(0).map(function() {
      return '<div class="pokemon-card skeleton"></div>';
    }).join('');
  }
  if (detail) {
    detail.innerHTML = '<div class="detail-loading"><div class="spinner"></div><p>Loading Pokémon data\u2026</p></div>';
  }
}

function hideLoadingState() {}

function showDataError() {
  var grid   = document.getElementById('pokemonGrid');
  var detail = document.getElementById('pokemonDetail');
  var msg =
    '<div class="error-state col-span-full">' +
      '<div class="text-4xl mb-3">&#9888;&#65039;</div>' +
      '<p class="text-red-400 text-lg">Failed to load Pokémon data</p>' +
      '<p class="text-gray-500 text-sm mt-1">Check that <code>data/pokemon.json</code> and <code>data/moves.json</code> exist.</p>' +
    '</div>';
  if (grid)   grid.innerHTML   = msg;
  if (detail) detail.innerHTML = msg;
}



// ====================== Animation Engine ======================

function initScrollReveal() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.scroll-reveal').forEach(function(el) { el.classList.add('revealed'); });
    return;
  }
  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) { entry.target.classList.add('revealed'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.scroll-reveal').forEach(function(el) { io.observe(el); });
}

function observeNewRevealTargets(container) {
  if (!('IntersectionObserver' in window)) {
    (container || document).querySelectorAll('.scroll-reveal').forEach(function(el) { el.classList.add('revealed'); });
    return;
  }
  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) { entry.target.classList.add('revealed'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  (container || document).querySelectorAll('.scroll-reveal:not(.revealed)').forEach(function(el) { io.observe(el); });
}

function staggerGridCards() {
  document.querySelectorAll('#pokemonGrid .pokemon-card').forEach(function(card, i) {
    card.style.setProperty('--card-index', i);
  });
}

function staggerGameCards() {
  document.querySelectorAll('.game-card').forEach(function(card, i) {
    card.style.animationDelay = (i * 0.07) + 's';
    card.style.animationFillMode = 'both';
  });
}

function staggerPdexCards() {
  document.querySelectorAll('.pdex-card').forEach(function(card, i) {
    card.style.animationDelay = Math.min(i * 0.018, 0.5) + 's';
    card.style.animationFillMode = 'both';
  });
}

function staggerMoveRows(container) {
  (container || document).querySelectorAll('.moves-table tbody tr').forEach(function(row, i) {
    row.style.animationDelay = Math.min(i * 0.025, 0.6) + 's';
    row.style.animationFillMode = 'both';
  });
}

function staggerBiomeTags(container) {
  (container || document).querySelectorAll('.biome-tag').forEach(function(tag, i) {
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
  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var el = entry.target;
        var target = parseFloat(el.dataset.target);
        if (!isNaN(target)) animateCounter(el, target, 900);
        io.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  pcts.forEach(function(el) { io.observe(el); });
}

// ====================== Init ======================
document.addEventListener('DOMContentLoaded', async function() {
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
    var typeFilter  = document.getElementById('typeFilter');
    var genFilter   = document.getElementById('genFilter');
    if (searchInput) searchInput.addEventListener('input',  function() { filterPokemon(); setTimeout(playAllVideos, 100); });
    if (typeFilter)  typeFilter.addEventListener('change',  function() { filterPokemon(); setTimeout(playAllVideos, 100); });
    if (genFilter)   genFilter.addEventListener('change',   function() { filterPokemon(); setTimeout(playAllVideos, 100); });
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

  if (document.getElementById('gamesTimeline')) {
    loadGamesPage();
  }

  if (document.getElementById('pdexGrid')) {
    loadPersonalPokedex();
    setTimeout(function() { staggerPdexCards(); initPdexCounters(); }, 50);
  }

  initScrollReveal();

  // Back to top visibility
  var backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', function() {
      backToTop.classList.toggle('visible', window.scrollY > 400);
    });
  }
});


// ====================== Compare Page ======================
var TYPE_CHART = {
  Normal:   { Rock:0.5, Ghost:0, Steel:0.5 },
  Fire:     { Fire:0.5, Water:0.5, Grass:2, Ice:2, Bug:2, Rock:0.5, Dragon:0.5, Steel:2 },
  Water:    { Fire:2, Water:0.5, Grass:0.5, Ground:2, Rock:2, Dragon:0.5 },
  Electric: { Water:2, Electric:0.5, Grass:0.5, Ground:0, Flying:2, Dragon:0.5 },
  Grass:    { Fire:0.5, Water:2, Grass:0.5, Poison:0.5, Ground:2, Flying:0.5, Bug:0.5, Rock:2, Dragon:0.5, Steel:0.5 },
  Ice:      { Fire:0.5, Water:0.5, Grass:2, Ice:0.5, Ground:2, Flying:2, Dragon:2, Steel:0.5 },
  Fighting: { Normal:2, Ice:2, Poison:0.5, Flying:0.5, Psychic:0.5, Bug:0.5, Rock:2, Ghost:0, Dark:2, Steel:2, Fairy:0.5 },
  Poison:   { Grass:2, Poison:0.5, Ground:0.5, Rock:0.5, Ghost:0.5, Steel:0, Fairy:2 },
  Ground:   { Fire:2, Electric:2, Grass:0.5, Poison:2, Flying:0, Bug:0.5, Rock:2, Steel:2 },
  Flying:   { Electric:0.5, Grass:2, Fighting:2, Bug:2, Rock:0.5, Steel:0.5 },
  Psychic:  { Fighting:2, Poison:2, Psychic:0.5, Dark:0, Steel:0.5 },
  Bug:      { Fire:0.5, Grass:2, Fighting:0.5, Flying:0.5, Psychic:2, Ghost:0.5, Dark:2, Steel:0.5, Fairy:0.5 },
  Rock:     { Fire:2, Ice:2, Fighting:0.5, Ground:0.5, Flying:2, Bug:2, Steel:0.5 },
  Ghost:    { Normal:0, Psychic:2, Ghost:2, Dark:0.5 },
  Dragon:   { Dragon:2, Steel:0.5, Fairy:0 },
  Dark:     { Fighting:0.5, Psychic:2, Ghost:2, Dark:0.5, Fairy:0.5 },
  Steel:    { Fire:0.5, Water:0.5, Electric:0.5, Ice:2, Rock:2, Steel:0.5, Fairy:2 },
  Fairy:    { Fire:0.5, Fighting:2, Poison:0.5, Dragon:2, Dark:2, Steel:0.5 },
};

var ALL_TYPES = ['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'];

var STAT_LABELS = { hp: 'HP', attack: 'Attack', defense: 'Defense', spAttack: 'Sp. Atk', spDefense: 'Sp. Def', speed: 'Speed' };

function loadComparePage() {
  // Populate Pokémon pickers
  var opts = State.allPokemon.map(function(p) {
    var num = p.number || String(p.id).padStart(4,'0');
    return '<option value="' + p.id + '">#' + num + ' ' + p.name + '</option>';
  }).join('');

  ['picker1','picker2'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML += opts;
  });

  // Populate move picker
  var moveOpts = Object.keys(State.allMoves).sort().map(function(name) {
    return '<option value="' + name + '">' + name + '</option>';
  }).join('');
  var calcMove = document.getElementById('calcMove');
  if (calcMove) calcMove.innerHTML += moveOpts;

  // Populate type pickers
  var typeOpts = ALL_TYPES.map(function(t) {
    return '<option value="' + t + '">' + t + '</option>';
  }).join('');
  ['calcAttackerType','calcDefType1','calcDefType2'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML += typeOpts;
  });
}

window.runCompare = function() {
  var id1  = parseInt(document.getElementById('picker1').value);
  var id2  = parseInt(document.getElementById('picker2').value);
  var result = document.getElementById('compareResult');
  if (!result) return;

  if (!id1 || !id2) { result.innerHTML = ''; return; }

  var p1 = getPokemonById(id1);
  var p2 = getPokemonById(id2);
  if (!p1 || !p2) return;

  var stats = Object.keys(STAT_LABELS);
  var maxVals = {};
  stats.forEach(function(k) {
    maxVals[k] = Math.max((p1.baseStats || {})[k] || 0, (p2.baseStats || {})[k] || 0, 1);
  });

  var total1 = stats.reduce(function(t,k){ return t + ((p1.baseStats||{})[k]||0); }, 0);
  var total2 = stats.reduce(function(t,k){ return t + ((p2.baseStats||{})[k]||0); }, 0);

  function statRows(poke, other) {
    return stats.map(function(k) {
      var val   = (poke.baseStats  || {})[k] || 0;
      var oval  = (other.baseStats || {})[k] || 0;
      var pct   = ((val / 255) * 100).toFixed(1);
      var wins  = val > oval;
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
    var sprite  = poke.video || poke.sprite;
    var wins    = total > (other.baseStats ? Object.keys(STAT_LABELS).reduce(function(t,k){ return t+((other.baseStats||{})[k]||0); },0) : 0);
    var num     = poke.number || String(poke.id).padStart(4,'0');
    return (
      '<div class="cmp-card' + (wins ? ' cmp-winner' : '') + '">' +
        (wins ? '<div class="cmp-winner-badge">Winner</div>' : '') +
        '<div class="cmp-sprite-wrap">' + buildSpriteEl(sprite, poke.name, 'cmp-sprite') + '</div>' +
        '<p class="cmp-number">#' + num + '</p>' +
        '<h3 class="cmp-name"><a href="pokemon.html?id=' + poke.id + '" class="move-link">' + poke.name + '</a></h3>' +
        '<div class="badge-row" style="justify-content:center;margin-bottom:0.75rem">' + buildTypeBadges(poke.types) + '</div>' +
        '<div class="cmp-stats">' + statRows(poke, other) + '</div>' +
        '<div class="cmp-total" style="color:' + (wins?'#4ade80':total===total2?'#facc15':'#f87171') + '">Total: ' + total + '</div>' +
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

window.runCalc = function() {
  var moveName  = document.getElementById('calcMove').value;
  var atkType   = document.getElementById('calcAttackerType').value;
  var defType1  = document.getElementById('calcDefType1').value;
  var defType2  = document.getElementById('calcDefType2').value;
  var result    = document.getElementById('calcResult');
  if (!result) return;

  if (!moveName || !defType1) { result.innerHTML = ''; return; }

  var move      = State.allMoves[moveName];
  var moveType  = move ? move.type : atkType;
  var power     = parseInt(move && move.power) || 0;

  // Type effectiveness
  function effectiveness(attackType, defType) {
    if (!attackType || !defType) return 1;
    var chart = TYPE_CHART[attackType] || {};
    return chart[defType] !== undefined ? chart[defType] : 1;
  }

  var mult1 = effectiveness(moveType, defType1);
  var mult2 = defType2 ? effectiveness(moveType, defType2) : 1;
  var total  = mult1 * mult2;

  var color  = total >= 2 ? '#4ade80' : total === 1 ? '#facc15' : total > 0 ? '#f87171' : '#6b7280';
  var label  = total === 0 ? 'No effect' : total < 1 ? 'Not very effective' : total === 1 ? 'Normal effectiveness' : 'Super effective!';

  var stab   = moveType && atkType && moveType === atkType ? 1.5 : 1;
  var baseDmg = power ? Math.round(power * total * stab) : null;

  result.innerHTML =
    '<div class="calc-result">' +
      '<div class="calc-multiplier" style="color:' + color + '">' + total + 'x</div>' +
      '<div class="calc-label-text" style="color:' + color + '">' + label + '</div>' +
      '<div class="calc-breakdown">' +
        '<span class="calc-chip">Move: <strong>' + moveName + '</strong></span>' +
        '<span class="calc-chip">Type: <strong>' + (moveType||'?') + '</strong></span>' +
        (power ? '<span class="calc-chip">Base Power: <strong>' + power + '</strong></span>' : '') +
        (stab > 1 ? '<span class="calc-chip stab">STAB ×1.5</span>' : '') +
        (baseDmg ? '<span class="calc-chip">Estimated Power: <strong>' + baseDmg + '</strong></span>' : '') +
      '</div>' +
    '</div>';
  staggerMoveRows(content);
};


// ====================== Games Timeline Page ======================
var REGION_COLORS = {
  Kanto:  '#e53935',
  Johto:  '#fdd835',
  Hoenn:  '#1e88e5',
  Sinnoh: '#8e24aa',
  Unova:  '#757575',
  Kalos:  '#3949ab',
  Alola:  '#fb8c00',
  Galar:  '#6d4c41',
  Paldea:  '#c0ca33',
};

function loadGamesPage() {
  var container = document.getElementById('gamesTimeline');
  if (!container) return;

  var games = State.allGames;
  if (!games.length) {
    container.innerHTML = '<p class="moves-empty">No games data found.</p>';
    return;
  }

  var sorted = games.slice().sort(function(a, b) { return a.row - b.row; });

  var html = sorted.map(function(row, rowIndex) {
    var cards = (row.entries || []).map(function(game) {
      var genLabel    = game.generation ? 'Gen ' + game.generation : '';
      var regionColor = REGION_COLORS[game.region] || '#9ca3af';
      var gameColor   = game.color || null;

      // Build inline CSS variables
      var styleVars = '';
      if (gameColor) {
        styleVars += '--game-color:' + gameColor + '08;';
        styleVars += '--game-border:' + gameColor + '60;';
        styleVars += '--game-accent:' + gameColor + ';';
        styleVars += '--game-gradient:linear-gradient(135deg, #080b0f 0%, ' + gameColor + '55 100%);';
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
var _pdexFilter  = 'all';
var _pdexProgress = {}; // { id: { seen: bool, captured: bool } }

function loadPersonalPokedex() {
  // Load saved progress
  try {
    var saved = localStorage.getItem('pdexProgress');
    if (saved) _pdexProgress = JSON.parse(saved);
  } catch(e) {}

  var total = State.allPokemon.length;
  document.getElementById('pdexTotal').textContent = total;

  updatePdexStats();
  renderPdexGrid();
}

function savePdexProgress() {
  try { localStorage.setItem('pdexProgress', JSON.stringify(_pdexProgress)); } catch(e) {}
}

function updatePdexStats() {
  var total     = State.allPokemon.length;
  var captured  = 0;
  var seen      = 0;
  var legendary = 0;
  var mythical  = 0;

  State.allPokemon.forEach(function(poke) {
    var p = _pdexProgress[poke.id] || {};
    if (p.captured) {
      captured++;
      if (poke.legendary) legendary++;
      if (poke.mythical)  mythical++;
    }
    if (p.seen || p.captured) seen++;
  });

  var capPct  = total ? Math.round((captured / total) * 100) : 0;
  var seenPct = total ? Math.round((seen     / total) * 100) : 0;

  var capPctEl  = document.getElementById('capturedPct');
  var seenPctEl = document.getElementById('seenPct');
  var legEl     = document.getElementById('legendaryCount');
  var mythEl    = document.getElementById('mythicalCount');
  if (capPctEl)  { capPctEl.textContent  = capPct + '%';  capPctEl.dataset.target  = capPct;  capPctEl.dataset.pct = '1'; }
  if (seenPctEl) { seenPctEl.textContent = seenPct + '%'; seenPctEl.dataset.target = seenPct; seenPctEl.dataset.pct = '1'; }
  if (legEl)     { legEl.textContent     = legendary;     legEl.dataset.target     = legendary; }
  if (mythEl)    { mythEl.textContent    = mythical;      mythEl.dataset.target    = mythical; }
  document.getElementById('capturedCount').textContent  = captured + '/' + total;
  document.getElementById('seenCount').textContent      = seen + '/' + total;

  // Update missing button label
  var missing = total - captured;
  var missingBtn = document.getElementById('missingBtn');
  if (missingBtn) missingBtn.textContent = 'Missing (' + missing + ')';
}

function renderPdexGrid() {
  var grid = document.getElementById('pdexGrid');
  if (!grid) return;

  var list = State.allPokemon.filter(function(poke) {
    var p = _pdexProgress[poke.id] || {};
    switch (_pdexFilter) {
      case 'captured':  return p.captured;
      case 'seen':      return (p.seen || p.captured) && !p.captured ? true : p.seen && !p.captured;
      case 'legendary': return poke.legendary;
      case 'mythical':  return poke.mythical;
      case 'missing':   return !p.captured;
      default:          return true;
    }
  });

  if (list.length === 0) {
    grid.innerHTML = '<p class="moves-empty" style="grid-column:1/-1">No Pokémon in this category.</p>';
    return;
  }

  grid.innerHTML = list.map(function(poke) {
    var p        = _pdexProgress[poke.id] || {};
    var sprite   = poke.video || poke.sprite;
    var num      = poke.number || String(poke.id).padStart(4, '0');
    var isSeen   = p.seen || p.captured;
    var isCap    = p.captured;

    return (
      '<div class="pdex-card' + (isCap ? ' pdex-captured' : isSeen ? ' pdex-seen' : '') + '">' +
        '<div class="pdex-card-btns">' +
          '<button class="pdex-btn pdex-btn-seen' + (isSeen ? ' active' : '') + '" onclick="toggleSeen(' + poke.id + ')" title="Mark as Seen">👁</button>' +
          '<button class="pdex-btn pdex-btn-cap'  + (isCap  ? ' active' : '') + '" onclick="toggleCaptured(' + poke.id + ')" title="Mark as Captured">✓</button>' +
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

window.toggleSeen = function(id) {
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

window.toggleCaptured = function(id) {
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

window.setPdexFilter = function(filter) {
  _pdexFilter = filter;
  document.querySelectorAll('.pdex-filter').forEach(function(btn) {
    btn.classList.remove('active');
    if (btn.getAttribute('onclick') === "setPdexFilter('" + filter + "')") {
      btn.classList.add('active');
    }
  });
  renderPdexGrid();
  staggerPdexCards();
};

window.exportProgress = function() {
  var data = JSON.stringify(_pdexProgress, null, 2);
  var blob = new Blob([data], { type: 'application/json' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = 'pokedex-progress.json';
  a.click();
  URL.revokeObjectURL(url);
};

window.importProgress = function(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      _pdexProgress = JSON.parse(e.target.result);
      savePdexProgress();
      updatePdexStats();
      renderPdexGrid();
    } catch(err) {
      alert('Invalid progress file.');
    }
  };
  reader.readAsText(file);
};

window.resetProgress = function() {
  if (!confirm('Reset all progress? This cannot be undone.')) return;
  _pdexProgress = {};
  savePdexProgress();
  updatePdexStats();
  renderPdexGrid();
};