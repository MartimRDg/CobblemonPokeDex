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
    window._allMoves = State.allMoves;

    console.log('Loaded ' + State.allPokemon.length + ' Pokemon and ' + Object.keys(State.allMoves).length + ' moves');
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

function renderGrid(pokemonList) {
  const grid = document.getElementById('pokemonGrid');
  if (!grid) return;

  if (pokemonList.length === 0) {
    grid.innerHTML =
      '<div class="col-span-full text-center py-20 text-gray-500">' +
        '<div class="text-5xl mb-4">&#128269;</div>' +
        '<p class="text-xl">No Pokémon found</p>' +
        '<p class="text-sm mt-2">Try adjusting your filters</p>' +
      '</div>';
    return;
  }

  grid.innerHTML = pokemonList.map(function(poke) {
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

  renderGrid(filtered);
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
  var color = value >= 100 ? '#4ade80' : value >= 60 ? '#facc15' : '#f87171';
  return (
    '<div class="stat-row">' +
      '<span class="stat-label">' + (statLabels[label] || label) + '</span>' +
      '<span class="stat-value" style="color:' + color + '">' + value + '</span>' +
      '<div class="stat-bar-bg">' +
        '<div class="stat-bar-fill" style="width:' + pct + '%;background:' + color + '"></div>' +
      '</div>' +
    '</div>'
  );
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


// ====================== Riding Section ======================
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
    return '<div class="meta-tag">' + a + '</div>';
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

      buildRidingSection(poke) +

      '<section class="detail-section">' +
        '<h2 class="section-title">Moves</h2>' +
        '<div class="move-tabs" role="tablist">' + moveTabs + '</div>' +
        '<div id="movesContent" class="moves-content"></div>' +
      '</section>' +

      buildDecksSection(poke) +

    '</div>';

  window._shinyData = { poke: poke, isShiny: false, formIndex: 0 };
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
      return '<div class="meta-tag">' + a + '</div>';
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
function renderMoves(poke) {
  var content = document.getElementById('movesContent');
  if (!content) return;

  var keys  = ['level', 'tm', 'egg', 'tutor'];
  var moves = ((poke.moves || {})[keys[State.currentMoveTab]] || []).map(enrichMove);

  if (moves.length === 0) {
    content.innerHTML = '<p class="moves-empty">No moves in this category.</p>';
    return;
  }

  if (State.currentMoveTab !== 0) {
    moves = moves.slice().sort(function(a, b) { return (parseInt(b.power) || 0) - (parseInt(a.power) || 0); });
  }

  var isLevelTab = State.currentMoveTab === 0;

  var rows = moves.map(function(m) {
    var typeCell = m.type
      ? '<span class="type-badge type-' + m.type.toLowerCase() + ' type-xs">' + m.type + '</span>'
      : '\u2014';
    return (
      '<tr>' +
        (isLevelTab ? '<td class="move-level">' + (m.level || '\u2014') + '</td>' : '') +
        '<td class="move-name">' + m.name + '</td>' +
        '<td>' + typeCell + '</td>' +
        '<td class="move-cat">' + (m.category || '\u2014') + '</td>' +
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

window.switchMoveTab = function(index) {
  State.currentMoveTab = index;
  document.querySelectorAll('.move-tab').forEach(function(btn, i) {
    var active = i === index;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active);
  });
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


// ====================== Loading / Error States ======================
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
    renderTop5();
    renderGrid(State.allPokemon);
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
});