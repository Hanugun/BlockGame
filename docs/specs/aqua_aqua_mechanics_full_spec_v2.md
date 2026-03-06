# Aqua Aqua — mechanics breakdown from uploaded gameplay + external research

Version: v2  
Basis: direct review of the uploaded no-commentary gameplay video, especially the tutorial section and the later Story Mode run, plus corroborating external references (manual/guide/reviews).  
Purpose: give an implementation-facing spec to Codex for improving an Aqua Aqua–like prototype without inventing systems that are not supported by the source material.

---

## 1. Confidence legend

- **High confidence**: clearly shown in the uploaded footage and also supported by external references.
- **Medium confidence**: strongly suggested by footage and supported by older written sources, but exact numeric values are not visible.
- **Low confidence / unresolved**: plausible, but not directly provable from this video alone.

Whenever a rule below is uncertain, it is explicitly marked.

---

## 2. Direct corrections to the user's current understanding

### 2.1 Rainbow condition
**Your guess:** rainbow happens when 3 water blocks are placed successfully without spilling.  
**Correction:** this is **not supported** by the old guide. The guide states rainbow appears **when you have lots of water on your land**, and it functions as a **score bonus state**, not as a basic reward for simply dropping three water pieces cleanly. The video also supports this: the rainbow appears later in a more built-up state with substantial retained water, not immediately after a trivial 3-drop sequence.

**Implementation takeaway:**
- Do **not** trigger rainbow from “3 good water placements.”
- Trigger rainbow from **sufficient retained water / strong board water state**.
- Treat rainbow as a **temporary scoring amplifier / bonus state**.

**Confidence:** High.

---

### 2.2 Ice + fire interaction
**Your guess:** fire on ice does not evaporate; it melts the ice first, which can make scoring harder.  
**Correction:** this matches the guide. Ice freezes a lake, and then you typically need **two fireballs total** to fully get rid of that frozen water state: first to melt, then again to evaporate, unless you dig the area away with terrain reduction tools.

**Implementation takeaway:**
- Fire on frozen water should **thaw / downgrade the frozen state first**.
- It should **not immediately count as full evaporation** of that lake.
- Frozen water is therefore a scoring delay and often a tactical nuisance.

**Confidence:** High.

---

### 2.3 Score multiplier from bigger evaporation
**Your guess:** the more water you evaporate, the higher the score multiplier.  
**Correction:** essentially correct. Written sources describe scoring as higher when more water is evaporated at once, and the old guide also layers in level, lake count, lake mates, and rainbow state.

**Implementation takeaway:**
- Preserve **batch-evaporation reward**.
- Large, mature lakes should score much better than tiny opportunistic evaporations.

**Confidence:** High.

---

### 2.4 Piece order / pacing
**Your guess:** terrain comes first most of the time, then water, then fire; this order matters because early fire is useless and early water is often premature.  
**Correction:** this is strongly supported by the footage and by the game’s design logic.

**Implementation takeaway:**
- Early game piece generation should be **terrain-heavy**.
- Water should begin only after the player has had a fair chance to create enclosure potential.
- Fire should come only after the game has created realistic opportunities to evaporate meaningful retained water.
- Hazard pieces should unlock later and in stages.

**Confidence:** High.

---

### 2.5 Right-side water tube
**Your question:** how does the right bar go down?  
**Best supported answer:** in the observed footage, the right tube behaves primarily like a **cumulative leak / drain meter**. It clearly fills when water spills from the map, and if it fills completely, the run ends. I did **not** find reliable evidence in this video that normal play actions consistently reduce the filled amount during the same run. What is clearly supported externally is that one bingo effect makes the **drain bigger by 25%**, meaning the system is mainly treated as a failure-capacity meter, not a standard refillable resource bar.

**Implementation takeaway:**
- Model this as a **loss meter**.
- The safest interpretation is:
  - spilled water -> meter increases
  - full meter -> game over
  - meter normally does **not** drain down on its own during a stage
  - special effects may increase capacity, but ordinary skillful play should prevent increases rather than actively reduce it
- If you want authenticity, do **not** add a modern “recover leak meter by playing well” mechanic unless you later verify it from more footage/manual proof.

**Confidence:** Medium-high.

---

### 2.6 Earthquake trigger
**Your request:** max height should be same as Aqua Aqua, and exceeding it should cause earthquake.  
**Correction / nuance:** the old written sources consistently describe an **earthquake meter** rather than a plainly exposed numeric per-column hard cap. In practice, excessive terrain height / imbalance leads toward earthquake, and the tutorial explicitly teaches “Earthquake” as its own system. So the most authentic reading is **not** “hard stop at visible height N,” but rather “overbuilding raises earthquake risk until the quake event fires.”

**Implementation takeaway:**
- Implement earthquake as a **systemic punishment for overbuilt terrain**, not just a raw clamp.
- A practical replica would use:
  - per-cell height values,
  - a global quake-risk meter based on tallest points and/or aggregate excess height,
  - quake event when threshold reached,
  - quake then damages / destabilizes the landscape.

**Confidence:** Medium-high.

---

## 3. High-level game objective

Aqua Aqua is a terrain-shaping puzzle game where the player tries to:

1. **raise and shape land** using falling terrain pieces,
2. **create enclosed basins/lakes** that can hold water without leaking off the map,
3. **drop water pieces** into those enclosed areas,
4. **evaporate retained water** with fire for points,
5. **avoid leaks, terrain instability, and hazards**, and
6. in Story Mode, **reach score thresholds before boss attacks or survive board-damaging boss events**.

This basic loop is supported by the review/guide sources and by the tutorial sequence in the uploaded video.

---

## 4. Terminology (for your codex / implementation)

Because some English terms are awkward, use these internal definitions:

- **Tile / cell** = one logical grid square of terrain.
- **Height** = integer elevation of a cell.
- **Terrain piece / upper** = a placed shape that raises terrain.
- **Downer / cutter** = a terrain-lowering piece or effect.
- **Lake / basin** = an enclosed low area where water is retained.
- **Leak** = water escaping off the edge of the board.
- **Drain tube** = the right-side failure meter that fills from leaks.
- **Fire piece** = the evaporator piece.
- **Frozen water** = water disabled by ice until thawed.
- **Lake mate** = bonus state tied to a sufficiently deep / well-formed lake.
- **Boss attack** = scripted story-mode disruption event.

For Russian note:
- **Basin / lake / enclosure** in this context = **замкнутая впадина / закрытая чаша / озеро**, meaning terrain walls fully surround lower ground so water stays inside.

---

## 5. Board structure and spatial rules

### 5.1 Board footprint
- The bottom-left placement preview visible during Story gameplay strongly suggests a **6×6 placement grid** for the cursor projection.
- However, due to camera perspective and the sculpted terrain mesh, I cannot prove from this video alone whether the hidden simulation lattice is exactly 6×6 or whether the preview is a simplified projection.

**Recommended implementation choice:**
- Use **6×6** as the board footprint if your current prototype needs a concrete size and you want to stay visually close to the footage.
- Mark this internally as “best-fit from footage, not 100% proven.”

**Confidence:** Medium.

### 5.2 Terrain is grid-based, not freeform
The game may render soft hills visually, but interaction is still fundamentally **discrete grid-based terrain logic**:
- pieces snap to grid,
- water is retained by cell elevation topology,
- terrain changes are chunky, not smooth brush sculpting.

**Confidence:** High.

### 5.3 Height model
Every cell should have an integer height.  
Terrain pieces add height to selected cells; damaging or lowering tools subtract height.

**Confidence:** High.

---

## 6. Piece set and shape language

### 6.1 Terrain pieces are tetromino-like and fit a compact footprint
From the tutorial footage and older reviews/guides:
- terrain pieces are clearly **Tetris-like**,
- observed shapes include **L**, **T**, **square**, and **straight/line-style** footprints,
- the user’s observation that pieces are “3 tiles in width” is directionally correct in the sense that most visible pieces fit into a **3-cell-wide bounding box**, though they are not all triominoes.

**Important correction:**
- These are **not just 3-cell pieces**.
- At least some visible pieces are effectively **tetromino-style footprints** occupying 4 cells.
- The practical rule is: pieces usually fit inside a **3×3 bounding box**, but the occupied tile count is not always 3.

**Confidence:** High.

### 6.2 Recommended piece catalog for faithful implementation
Use at minimum:
- **I** (straight)
- **O / square**
- **L**
- **T**

Potential extras can be added later only if verified from more footage.

### 6.3 Rotation and drop
The guide explicitly supports rotation and faster drop:
- rotate piece before landing,
- accelerate descent,
- place on grid-aligned target area.

**Confidence:** High.

---

## 7. What the player controls vs what the player does not control

### 7.1 Player-controlled
The player directly controls:
- active falling piece position,
- piece rotation,
- drop timing / faster descent,
- where terrain/water/fire is placed,
- strategic choice of where to “dump” harmful pieces if unavoidable,
- emergency response to hazards,
- board shaping for future retention and scoring.

### 7.2 Not directly player-controlled
The player does **not** directly control:
- future piece sequence,
- random hazard arrival timing,
- ice cube fall path once spawned,
- rain placement,
- boss attack timing once story thresholds are reached,
- exact water spread after release (beyond indirect control via terrain shape).

**Confidence:** High.

---

## 8. Core gameplay loop

### 8.1 Phase A — terrain preparation
At the start of a run or sub-phase, the player primarily receives terrain pieces and should:
- build perimeter walls,
- convert open slopes into closed bowls,
- avoid making the center too lumpy too early,
- leave some “waste zone” / sacrificial area for dangerous pieces.

### 8.2 Phase B — water retention
Once a valid enclosure exists, water pieces become meaningful:
- dropping water into open terrain is usually wasteful,
- dropping water near the edge is actively dangerous because leaks increase the drain tube,
- successful water placement creates stored scoring potential.

### 8.3 Phase C — evaporation for score
Once enough water is retained:
- fire converts stored water into points,
- larger evaporation batches are rewarded more heavily,
- rainbow and related bonus states should make big evaporations especially valuable.

### 8.4 Phase D — board maintenance
The player must continuously respond to:
- leaks,
- holes,
- over-height terrain,
- frozen lakes,
- bombs/mines,
- boss disruptions.

This maintenance burden is not secondary; it is one of the game’s core tensions.

---

## 9. Water system

### 9.1 Water model style
Your statement “Wetrix style works” is correct.  
Aqua Aqua should be treated as a **tile-based retained-liquid system**, not particle-fluid simulation.

**Recommended simulation model:**
- water volume is stored per cell,
- water redistributes across connected lower areas,
- equalization seeks local level balance,
- open paths to lower cells / board edges cause escape,
- the edge of the board is lethal for uncontained water.

**Confidence:** High.

### 9.2 Consequence of water placement
When the player drops a water piece:
- if the terrain is enclosed -> water settles and becomes retained volume,
- if terrain is partially enclosed -> water may split, spread, and partially leak,
- if terrain is open to the edge -> leak is likely immediate or near-immediate.

### 9.3 Water is both resource and threat
Water is not just score material.
It is also:
- potential leak fuel,
- future frozen obstruction,
- something boss attacks can weaponize by breaking walls.

### 9.4 Retention matters more than raw placement count
Scoring does **not** come from merely placing water pieces.  
Scoring comes from **successfully retaining and then evaporating** meaningful water volume.

---

## 10. Fire system

### 10.1 Main purpose
Fire is primarily a **conversion tool**:
- retained water -> score.

### 10.2 Secondary purpose
Older sources also note that fire used on land can lower terrain. So fire is not only a scorer; it can also function as a **terrain-management tool**, especially for reducing overbuilt areas.

### 10.3 Consequence of fire use
- on open dry land: may lower terrain / flatten a problem area,
- on liquid water: evaporates and scores,
- on frozen water: thaws / partially resolves ice first rather than granting full evaporation value.

---

## 11. Downers / terrain reduction

### 11.1 Purpose
These are essential, not optional cleanup tools.

Use cases:
- reduce quake risk,
- flatten accidental spikes,
- merge separated bowls by cutting interior walls,
- fix overbuilt terrain that blocks good water equalization,
- strategically destroy unhelpful formations.

### 11.2 Design consequence
A faithful clone should never be “terrain-up only.”  
Without a lowering mechanic, Aqua Aqua’s actual board-management tension is lost.

---

## 12. Lake creation logic

### 12.1 Definition
A lake exists when:
- terrain cells form a closed enclosure,
- the enclosed low area can hold water,
- there is no leak path to the outer board edge at the current water height.

### 12.2 Practical player lesson from tutorial
The tutorial progression strongly teaches:
1. build perimeter wall,
2. create small lake,
3. join lakes together,
4. then learn rainbow bonus,
5. then hazards and maintenance.

That ordering is very important for your prototype’s onboarding.

### 12.3 Joined lakes
The tutorial explicitly has “Join Lakes Together.”  
This means the game supports merging separate retention zones into a larger effective scoring body.

**Implementation consequence:**
- allow terrain cuts / shape edits that connect formerly separate basins,
- once connected, water should rebalance across the shared enclosure.

---

## 13. Lake mates

### 13.1 What they are
The old guide says lake mates appear when you have a **2-wall-high lake with enough water in it** and that they give extra points.

### 13.2 Implementation guidance
Treat lake mates as a bonus flag triggered by:
- sufficient enclosure depth,
- sufficient retained water volume,
- likely a stable mature lake state rather than a tiny puddle.

### 13.3 Why they matter
Lake mates push the player toward:
- building **deeper, cleaner** lakes,
- not just quick shallow evaporations,
- maintaining water safely long enough for bonus states to develop.

**Confidence:** Medium-high.

---

## 14. Rainbow bonus

### 14.1 Trigger
Best-supported rule: **lots of water retained on your land**.

### 14.2 Effect
Rainbow gives extra points and materially changes the value of evaporation timing.

### 14.3 Strategic consequence
Optimal play is often:
- keep building,
- keep filling,
- wait for rainbow / strong board state,
- then cash out a large evaporation.

### 14.4 What not to do
Do **not** implement rainbow as a shallow combo reward like:
- 3 perfect water drops,
- 3 turns without spill,
- or purely time-based.

That would drift away from Aqua Aqua’s deeper retained-volume identity.

---

## 15. Leak / drain tube system (right-side meter)

### 15.1 What it represents
The right-side tube is the **water loss meter**.

### 15.2 What fills it
- water escaping off the board edge,
- possibly also major catastrophic breaches causing mass spill.

### 15.3 What happens when full
- game over.

This is directly stated in the old guide and visibly demonstrated in the video.

### 15.4 Does it naturally go down?
Observed conclusion:
- I do **not** have strong evidence that normal skillful play steadily reduces it during an active run.
- What is clearly supported is that one bingo effect enlarges the “drain.”
- Therefore the safest authentic implementation is: **this is cumulative punishment capacity, not a refillable health bar**.

### 15.5 Recommended implementation
Use:
- `leak_meter_current`
- `leak_meter_max`
- `on_water_spilled(volume): leak_meter_current += spill_to_meter(volume)`
- `if leak_meter_current >= leak_meter_max: lose_run()`

Optionally, only special modifiers may change `leak_meter_max`.

---

## 16. Hazard systems

### 16.1 Bombs
Supported by tutorial + old guide.

Function:
- destroy terrain / create holes,
- dangerous if dropped in important lakes,
- often should be dumped in a sacrificial zone.

### 16.2 Mines
Written guide says mines in water are extremely dangerous because evaporating that water can trigger destructive explosion.

**Note:** I did not isolate a crystal-clear mine sequence in the uploaded video, so treat this as externally supported, not video-proven.

### 16.3 Ice cubes
Clearly supported by footage and guide.

Function:
- spawn without direct player control,
- freeze water,
- make evaporation less efficient / delayed,
- require thawing first.

### 16.4 Rain
Externally supported and partially visible in later gameplay.

Function:
- uncontrolled water falling onto the board,
- can be beneficial if you have a broad safe lake,
- can be disastrous if the board is open or broken.

### 16.5 Boss attacks
Story Mode includes scripted destructive events.

Based on written sources and the footage, boss attacks can:
- smash terrain,
- break walls,
- force leaks,
- interrupt stable scoring setups,
- punish a board that is not robust before the threshold is reached.

---

## 17. Earthquake system

### 17.1 It is its own taught mechanic
The tutorial list explicitly includes **Earthquake** as a separate lesson.

### 17.2 What causes it
Most supported interpretation:
- excessive terrain accumulation and/or imbalance raises quake risk,
- once the quake threshold is reached, an earthquake event fires and damages terrain.

### 17.3 What earthquake does
- destabilizes carefully built walls,
- can ruin lakes,
- can create new leak paths,
- effectively punishes greedy vertical stacking.

### 17.4 Implementation recommendation
Use a global quake meter driven by something like:
- tallest cell above safe height,
- total number of cells above safe height,
- variance / imbalance penalty,
- maybe rapid stacking in one local cluster.

Pseudo-rule:
```text
for each placed terrain piece:
    for each affected cell:
        if height[cell] > safe_height:
            quake_meter += (height[cell] - safe_height) * local_weight

if quake_meter >= quake_threshold:
    trigger_earthquake()
    damage terrain
    reduce quake_meter (partial reset)
```

### 17.5 Important authenticity note
Do not silently clamp placement at max height.  
The punishment should be a **dramatic event** (earthquake), because that is part of the game’s identity.

---

## 18. Story Mode progression and monster timing

### 18.1 The user’s interpretation is directionally correct
The later gameplay is not endless sandbox. It is a **score race under threat**.

### 18.2 Best-supported structure
Written sources describe Story Mode as:
- score target–driven,
- time / progression gated,
- with boss attacks arriving several times per level,
- where failing to be prepared means the boss damages the board.

### 18.3 Consequence for game feel
This means Story Mode is not just “optimize forever.” It is:
- build fast,
- secure water fast,
- cash points efficiently,
- brace for disruption,
- recover from disruption.

### 18.4 Implementation consequence
Your prototype should distinguish at least two modes:
- **Puzzle / endless / quick mode**: pure score survival without boss interruptions,
- **Story / pressure mode**: score checkpoints with scripted attack events.

---

## 19. Observed tutorial curriculum from the uploaded video

The uploaded tutorial menu shows these lessons in this order:

1. Build Perimeter Wall
2. Create Small Lake
3. Join Lakes Together
4. Rainbow Bonus
5. Bomb Control
6. Lake Mates
7. Repair Holes
8. Earthquake

This ordering is excellent and should be copied if you want the prototype to teach the same mental model.

### Why this order matters
It teaches the player the correct ontology of the game:
- first shape terrain,
- then retain water,
- then optimize score,
- then survive hazards,
- then maintain a damaged board,
- then understand global structural punishment.

---

## 20. What “good play” looks like in Aqua Aqua

A strong player generally:
- builds a perimeter before getting greedy,
- creates one or more reliable bowls,
- avoids putting water near open edges,
- keeps a sacrificial dump zone for bad pieces,
- uses reduction tools to avoid earthquake risk,
- waits for meaningful retained water before firing,
- leverages rainbow / lake mate states before cash-out,
- plans for future hazards rather than reacting only after disaster.

The “dumb player” in the uploaded footage is useful because it shows failure consequences clearly:
- premature water placement leaks,
- awkward terrain stacking reduces future flexibility,
- unprepared boards are destroyed by hazards,
- bad shape management makes recovery much harder than initial construction.

---

## 21. Failure states and punishments

### 21.1 Immediate / primary fail state
- drain tube fills from leaked water -> game over.

### 21.2 Indirect failure states
These do not instantly end the run, but they often cascade into defeat:
- hole in a major lake wall,
- over-tall terrain causing earthquake,
- frozen high-value lake at the wrong time,
- bomb/mine destroying retention architecture,
- boss attack opening escape paths just before a large retained-water state.

---

## 22. Most faithful system ordering for content unlocks

Based on the tutorial and observed gameplay, your prototype should unlock / introduce systems in roughly this order:

1. terrain uppers only
2. water
3. fire
4. terrain reduction / joining / repair concepts
5. bombs
6. lake mate bonus
7. earthquake risk
8. ice warning + ice drops
9. rain / heavier hazards
10. story-mode boss attack sequences

This ordering matters a lot. Aqua Aqua is not random-chaos-first.
It is **structured escalation**.

---

## 23. Recommended concrete implementation rules for your prototype

### 23.1 Board
- Use a **6×6 board** for now.
- Keep underlying simulation strictly tile-based.

### 23.2 Terrain pieces
- Use tetromino-like pieces with compact 3×3 bounds where possible:
  - I, O, L, T.
- Let them raise affected cells by +1 height.

### 23.3 Water
- Water piece adds volume into target cells.
- Water redistributes Wetrix-style across connected lower spaces.
- Any path to board edge at effective water level causes leak volume loss.

### 23.4 Fire
- On liquid water: evaporate water and score.
- On frozen water: thaw first.
- On land: optionally lower terrain one step.

### 23.5 Drain meter
- Increase only from spills.
- Full = loss.
- Do not auto-heal during a run.

### 23.6 Earthquake
- Do not use a silent height cap.
- Use a quake-risk meter from overbuilt terrain.
- When threshold hit: destructive earthquake event.

### 23.7 Rainbow
- Trigger from large retained-water state.
- Use as a score multiplier state.

### 23.8 Ice
- Introduce later in progression.
- Warn before impact.
- Freeze retained water.
- Require thaw then evaporate.

### 23.9 Boss / story attacks
- Trigger by score thresholds or phase checkpoints.
- Attacks should damage terrain, not just do cosmetic animation.

---

## 24. Systems your current gameplay most likely needs to improve

Based on the footage and your notes, these are the most important authenticity gaps to watch for:

### 24.1 Do not over-randomize piece order
Aqua Aqua’s tension depends on **meaningful sequence staging**, not pure chaos.

### 24.2 Make terrain management as important as scoring
If the prototype is too focused on “drop water then fire,” it will miss the genre identity.

### 24.3 Make leaks cumulative and scary
The right tube is central to player tension.

### 24.4 Make board architecture matter after mistakes
Bad placements should create long-tail consequences, not minor temporary inconvenience.

### 24.5 Reward large planned evaporations over tiny spam evaporations
This is essential for authentic scoring feel.

### 24.6 Make hazards interact with existing water state
Ice, bombs, and boss attacks are interesting because they corrupt a board the player has already invested in.

---

## 25. Open uncertainties that should not be guessed blindly

These are the remaining points I would **not** hard-code as fact without another footage pass or manual proof:

1. **Exact hidden board lattice** beyond the visible 6×6 placement preview.
2. **Exact numeric safe height** before earthquake risk becomes critical.
3. **Exact rainbow threshold** in water-volume terms.
4. **Exact lake mate threshold** in volume/depth terms.
5. **Exact spill-to-meter conversion formula**.
6. **Exact boss attack schedule logic** for every stage.
7. **Whether any rare mechanic lowers current drain fill during an active run**.

For now, use best-fit values and keep them data-driven.

---

## 26. Suggested data-driven config structure

```yaml
board:
  width: 6
  height: 6

terrain:
  safe_height: 3
  quake_threshold: 100
  piece_set: [I, O, L, T]
  raise_amount_per_tile: 1

water:
  equalization_mode: wetrix_like
  edge_leak_enabled: true
  spill_meter_scale: 1.0

fire:
  evaporate_score_per_unit: data_driven
  can_lower_land: true
  land_lower_amount: 1
  frozen_requires_thaw_first: true

bonus:
  rainbow_water_threshold: data_driven
  rainbow_score_multiplier: data_driven
  lake_mate_min_depth: 2
  lake_mate_min_volume: data_driven

hazards:
  bombs_enabled: true
  ice_enabled_from_level: 2
  rain_enabled_from_level: 3
  boss_attacks_enabled_in_story: true

drain:
  max_value: data_driven
  auto_decay: false
```

---

## 27. Final implementation priority order for Codex

Tell Codex to fix things in this exact order:

1. **terrain grid + piece placement**
2. **Wetrix-style water retention / leak logic**
3. **fire evaporation scoring**
4. **drain tube fail condition**
5. **terrain reduction + repair / merge behavior**
6. **earthquake risk system**
7. **rainbow and lake mate bonus states**
8. **ice behavior**
9. **bomb / mine hazards**
10. **story-mode boss attack orchestration**

If the first 4 are weak, the game will not feel like Aqua Aqua no matter how many hazards are added.

---

## 28. Short conclusion

The uploaded footage confirms that Aqua Aqua is **not** just “Wetrix with prettier visuals.” It is a tightly staged terrain/water puzzle game where the real skill is:

- building useful enclosed geography,
- timing water safely,
- cashing out with fire at high-value moments,
- maintaining the board under escalating hazard pressure,
- and avoiding cumulative leak loss and structural overbuild punishment.

The biggest corrections versus your provisional understanding are:
- rainbow is tied to **large retained water state**, not a simple 3-drop success,
- the right-side tube is best treated as a **mostly cumulative leak meter**,
- earthquake is best modeled as **overbuild risk leading to a destructive event**, not merely a silent max-height cap,
- and piece sequencing should be **staged for fairness**, not random from turn 1.

---

## 29. External references used to verify older mechanics

- GameFAQs walkthrough / guide by FFrulez (controls, drain tube, block types, rainbow, lake mates, bingo effects, earthquake note)
- GameSpot review (core objective, fire/water scoring, earthquakes, ice, bombs, story-mode attacks)
- Wikipedia summary page for Aqua Aqua / Wetrix sequel relation and overview

