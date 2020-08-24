console.log("Loading ai.js")

class AI {
	constructor(name, description){
		this.name = name;
		this.description = description;
	}
	
	move(map, unit){}
}

class AISimple extends AI {
	constructor(){
		super("Simple", "Moves toward the nearest enemy or the nearest unexplored area.");
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
			let [x, y] = breadthFirstSearch(map, unit.x, unit.y, (x, y) => !map.isVisibleSpace(x, y));
			return {
				type: "move",
				x: x,
				y: y,
			};
		}
		// Attempt to attack, attacking a random unit.
		let attackableUnits = targetUnits.filter(target => Math.abs(target.x - unit.x) + Math.abs(target.y - unit.y) == 1);
		if (attackableUnits.length > 0){
			return {
				type: "attack",
				enemy: attackableUnits[Math.floor(Math.random() * attackableUnits.length)],
			};
		}
		// Move to the nearest enemy unit.
		let [x, y] = breadthFirstSearch(map, unit.x, unit.y, (x, y) => targetUnits.some(target => target.x == x && target.y == y));
		if (x !== unit.x || y !== unit.y){
			return {
				type: "move",
				x: x,
				y: y,
			};
		}
		// Move to the nearest unexplored area.
		[x, y] = breadthFirstSearch(map, unit.x, unit.y, (x, y) => !map.isVisibleSpace(x, y));
		return {
			type: "move",
			x: x,
			y: y,
		};
	}
}

function breadthFirstSearch(map, x, y, isTarget){
	let possibleMoves = [
		[x+1, y, x+1, y],
		[x, y+1, x, y+1],
		[x-1, y, x-1, y],
		[x, y-1, x, y-1],
	];
	let directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
	possibleMoves = possibleMoves.filter(move => map.isEmpty(move[0], move[1]));
	let examined = new Set([
		x + "," + y,
		(x+1) + "," + y,
		x + "," + (y+1),
		(x-1) + "," + y,
		x + "," + (y-1),
	]);
	while (possibleMoves.length > 0){
		let [movex, movey, currentx, currenty] = possibleMoves.shift();
		for (let [deltax, deltay] of directions){
			let positionString = (currentx + deltax) + "," + (currenty + deltay);
			if (examined.has(positionString)) continue;
			examined.add(positionString);
			if (isTarget(currentx + deltax, currenty + deltay)) return [movex, movey];
			if (map.isEmpty(currentx + deltax, currenty + deltay)) possibleMoves.push([movex, movey, currentx + deltax, currenty + deltay]);
		}
	}
	// Fail by just returning no move.
	return [x, y];
}

let ais = {
	simple: new AISimple(),
}