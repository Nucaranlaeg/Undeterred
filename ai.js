class AI {
	constructor(name, description, locked = true){
		this.name = name;
		this.description = description;
		this.locked = locked;
	}
	
	move(map, unit){}
}

class AISimple extends AI {
	constructor(){
		super("Simple", "Moves toward the nearest accessible enemy or the nearest unexplored area.", false);
	}
	
	move(map, unit){
		let targetUnits = [];
		if (unit.playerOwned){
			targetUnits = map.getVisibleEnemies();
		} else {
			if (!map.isVisible(unit)) return {};
			targetUnits = playerUnits.filter(unit => !unit.dead && unit.active);
			if (targetUnits.length == 0){
				// If all the player units are dead, don't crash.
				return {};
			}
		}
		if (targetUnits.length == 0){
			// Move to the nearest unexplored area.
			let [x, y, dist] = breadthFirstSearch(map, unit.x, unit.y, (x, y) => !map.isVisibleSpace(x, y), false);
			return {
				type: "move",
				x: x,
				y: y,
			};
		}
		// Attempt to attack, attacking a random unit.
		let attackableUnits = targetUnits.filter(target => Math.abs(target.x - unit.x) + Math.abs(target.y - unit.y) <= unit.stats.Range.value && map.isClearLine([unit.x, unit.y], [target.x, target.y]));
		if (attackableUnits.length > 0){
			return {
				type: "attack",
				enemy: attackableUnits[Math.floor(Math.random() * attackableUnits.length)],
			};
		}
		// Move to the nearest enemy unit.
		let [x, y, dist] = breadthFirstSearch(map, unit.x, unit.y, (x, y) => targetUnits.some(target => target.x == x && target.y == y), false);
		if (x !== unit.x || y !== unit.y){
			return {
				type: "move",
				x: x,
				y: y,
			};
		}
		// Move to the nearest unexplored area.
		[x, y, dist] = breadthFirstSearch(map, unit.x, unit.y, (x, y) => !map.isVisibleSpace(x, y), false);
		return {
			type: "move",
			x: x,
			y: y,
		};
	}
}

class AINearest extends AI {
	constructor(){
		super("Nearest", "Moves toward the nearest enemy or unexplored space.");
	}
	
	move(map, unit){
		let targetUnits = [];
		if (unit.playerOwned){
			targetUnits = map.getVisibleEnemies();
		} else {
			if (!map.isVisible(unit)) return {};
			targetUnits = playerUnits.filter(unit => !unit.dead && unit.active);
			if (targetUnits.length == 0){
				// If all the player units are dead, don't crash.
				return {};
			}
		}
		// Attempt to attack, attacking a random unit.
		let attackableUnits = targetUnits.filter(target => Math.abs(target.x - unit.x) + Math.abs(target.y - unit.y) <= unit.stats.Range.value && map.isClearLine([unit.x, unit.y], [target.x, target.y]));
		if (attackableUnits.length > 0){
			return {
				type: "attack",
				enemy: attackableUnits[Math.floor(Math.random() * attackableUnits.length)],
			};
		}
		// Move to the nearest enemy unit (or an unexplored space, if a player unit).
		let [x, y, dist] = breadthFirstSearch(map, unit.x, unit.y, (x, y) => targetUnits.some(target => target.x == x && target.y == y) || (unit.playerOwned && !map.isVisibleSpace(x, y)), false);
		// If there's a creature in the way, move randomly.
		if (!map.isEmpty(x, y, false)){
			[x, y, dist] = breadthFirstSearch(map, unit.x, unit.y, (x, y) => targetUnits.some(target => target.x == x && target.y == y) || (unit.playerOwned && !map.isVisibleSpace(x, y)), true);
			if (!map.isEmpty(x, y, false)){
				return moveRandomly(map, unit.x, unit.y);
			}
		}
		return {
			type: "move",
			x: x,
			y: y,
		};
	}
}

class AICoward extends AINearest {
	constructor(){
		super("Coward", "Flees enemies when low on health with positive regen.");
	}
	
	move(map, unit){
		// Flees based on % health, scaling up to 100% chance at 25% health.
		let isFleeing = (Math.sqrt(Math.random()) + 0.33333) / 1.33333 > unit.stats.Health.current / unit.stats.Health.value;
		// Don't flee if you can't regenerate.
		if (unit.stats.Regeneration.value <= unit.conditions.Bleeding.value){
			isFleeing = false;
		}
		if (!isFleeing) return super.move(map, unit);
		let targetUnits = [];
		if (unit.playerOwned){
			targetUnits = map.getVisibleEnemies();
		} else {
			if (!map.isVisible(unit)) return {};
			targetUnits = playerUnits.filter(unit => !unit.dead && unit.active);
			if (targetUnits.length == 0){
				// If all the player units are dead, don't crash.
				return {};
			}
		}
		if (targetUnits.length == 0) return super.move(map, unit);
		let possibleMoves = [
			[unit.x - 1, unit.y],
			[unit.x + 1, unit.y],
			[unit.x, unit.y - 1],
			[unit.x, unit.y + 1],
		];
		possibleMoves = possibleMoves.filter(pos => map.isEmpty(...pos));
		shuffle(possibleMoves);
		if (possibleMoves.length == 0) return {};
		// Move away from the nearest enemy unit.
		possibleMoves.map(move => {
			return [...move, breadthFirstSearch(map, move[0], move[1], (x, y) => targetUnits.some(target => target.x == x && target.y == y), true, 1)[2]];
		});
		possibleMoves.sort((a, b) => a[2] - b[2]);
		let [x, y] = possibleMoves[0];
		return {
			type: "move",
			x: x,
			y: y,
		};
	}
}

class AISummoner extends AI {
	constructor(){
		super("Summoner", "Stays still and summons minions to fight for him.");
	}
	
	move(map, unit){
		let targetUnits = [];
		if (unit.playerOwned){
			targetUnits = map.getVisibleEnemies();
		} else {
			if (!map.isVisible(unit)) return {};
			targetUnits = playerUnits.filter(unit => !unit.dead && unit.active);
			if (targetUnits.length == 0){
				// If all the player units are dead, don't crash.
				return {};
			}
		}
		// Attempt to attack, attacking a random unit.
		let attackableUnits = targetUnits.filter(target => Math.abs(target.x - unit.x) + Math.abs(target.y - unit.y) <= unit.stats.Range.value && map.isClearLine([unit.x, unit.y], [target.x, target.y]));
		if (attackableUnits.length > 0){
			return {
				type: "attack",
				enemy: attackableUnits[Math.floor(Math.random() * attackableUnits.length)],
			};
		}
		return {};
	}
}

function breadthFirstSearch(map, x, y, isTarget, ignoreCreatures, useDiagonals = 0){
	let possibleMoves = [
		[x+1, y, x+1, y, 0],
		[x, y+1, x, y+1, 0],
		[x-1, y, x-1, y, 0],
		[x, y-1, x, y-1, 0],
	];
	let directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
	// useDiagonals:
	if (useDiagonals){
		directions.push(...[[-1, -1], [-1, 1], [1, -1], [1, 1]]);
		possibleMoves.push(...[
			[x-1, y-1, x-1, y-1, 0],
			[x-1, y+1, x-1, y+1, 0],
			[x+1, y-1, x+1, y-1, 0],
			[x+1, y+1, x+1, y+1, 0],
		]);
	}
	shuffle(possibleMoves);
	shuffle(directions);
	possibleMoves = possibleMoves.filter(move => map.isEmpty(move[0], move[1]));
	let examined = new Set([
		x + "," + y,
		(x+1) + "," + y,
		x + "," + (y+1),
		(x-1) + "," + y,
		x + "," + (y-1),
	]);
	while (possibleMoves.length > 0){
		let [movex, movey, currentx, currenty, dist] = possibleMoves.shift();
		for (let [deltax, deltay] of directions){
			let positionString = (currentx + deltax) + "," + (currenty + deltay);
			if (examined.has(positionString)) continue;
			examined.add(positionString);
			if (isTarget(currentx + deltax, currenty + deltay)) return [movex, movey, dist];
			if (map.isEmpty(currentx + deltax, currenty + deltay, ignoreCreatures)) possibleMoves.push([movex, movey, currentx + deltax, currenty + deltay, dist + 1]);
		}
	}
	// Fail by just returning no move.
	return [x, y, Infinity];
}

function moveRandomly(map, x, y){
	let moves = [
		[x + 1, y],
		[x - 1, y],
		[x, y + 1],
		[x, y - 1],
	];
	shuffle(moves);
	for (let i = 0; i < 4; i++){
		if (map.isEmpty(moves[i][0], moves[i][1], false)){
			return {
				type: "move",
				x: moves[i][0],
				y: moves[i][1],
			};
		}
	}
	return {
		type: "move",
		x,
		y,
	};
}

let ais = {
	Simple: new AISimple(),
	Nearest: new AINearest(),
	Coward: new AICoward(),
	Summoner: new AISummoner(),
};

function fillAIDropdown(){
	let selectEls = document.querySelectorAll(".ai");
	selectEls.forEach(el => {
		while (el.firstChild){
			el.removeChild(el.lastChild);
		}
	});
	for (const [key, value] of Object.entries(ais)){
		let aiEl = document.createElement("option");
		aiEl.value = key;
		aiEl.innerHTML = key;
		if (value.locked){
			aiEl.disabled = true;
		} else {
			aiEl.title = value.description;
		}
		selectEls.forEach(el => {
			el.append(aiEl.cloneNode(true));
		});
	}
}

fillAIDropdown();