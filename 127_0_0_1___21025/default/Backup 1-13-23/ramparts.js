

function mapRamparts(tiles) {
    // require('util.min_cut').test('W5N9');

    /*
   - Posted 10 may 2018 by @saruss
   - Formatted, optimized, added readability, and modified for typescript by Carson Burke
   - Code for calculating the minCut in a room, written by Saruss
   - some readability added by Chobobobo for typescript
   - Fixed Game.map.getTerrainAt to Game.map.getRoomTerrain method -Shibdib
   */

    const bounds = {
        x1: 0,
        x2: 49,
        y1: 0,
        y2: 49
    }

    const UNWALKABLE = -1
    const NORMAL = 0
    const PROTECTED = 1
    const TO_EXIT = 2
    const EXIT = 3

    /**
     * An Array with Terrain information: -1 not usable, 2 Sink (Leads to Exit)
     */
    function generadeRoomMatrix(room) {
        const room_2d = Array(50)
            .fill(0)
            .map(x => Array(50).fill(UNWALKABLE)) // Array for room tiles
        let i = bounds.x1
        const imax = bounds.x2
        let j = bounds.y1
        const jmax = bounds.y2
        const terrain = Game.map.getRoomTerrain(room.name)

        for (; i <= imax; i += 1) {
            j = bounds.y1
            for (; j <= jmax; j += 1) {
                if (terrain.get(i, j) !== TERRAIN_MASK_WALL) {
                    room_2d[i][j] = NORMAL // mark unwalkable
                    if (i === bounds.x1 || j === bounds.y1 || i === bounds.x2 || j === bounds.y2)
                        room_2d[i][j] = TO_EXIT // Sink Tiles mark from given bounds
                    if (i === 0 || j === 0 || i === 49 || j === 49) room_2d[i][j] = EXIT // Exit Tiles mark
                }
            }
        }

        // Marks tiles Near Exits for sink- where you cannot build wall/rampart
        let y = 1
        const max = 49
        for (; y < max; y += 1) {
            if (room_2d[0][y - 1] === EXIT) room_2d[1][y] = TO_EXIT
            if (room_2d[0][y] === EXIT) room_2d[1][y] = TO_EXIT
            if (room_2d[0][y + 1] === EXIT) room_2d[1][y] = TO_EXIT
            if (room_2d[49][y - 1] === EXIT) room_2d[48][y] = TO_EXIT
            if (room_2d[49][y] === EXIT) room_2d[48][y] = TO_EXIT
            if (room_2d[49][y + 1] === EXIT) room_2d[48][y] = TO_EXIT
        }
        let x = 1
        for (; x < max; x += 1) {
            if (room_2d[x - 1][0] === EXIT) room_2d[x][1] = TO_EXIT
            if (room_2d[x][0] === EXIT) room_2d[x][1] = TO_EXIT
            if (room_2d[x + 1][0] === EXIT) room_2d[x][1] = TO_EXIT
            if (room_2d[x - 1][49] === EXIT) room_2d[x][48] = TO_EXIT
            if (room_2d[x][49] === EXIT) room_2d[x][48] = TO_EXIT
            if (room_2d[x + 1][49] === EXIT) room_2d[x][48] = TO_EXIT
        }
        // mark Border Tiles as not usable
        y = 1
        for (; y < max; y += 1) {
            room_2d[0][y] === UNWALKABLE
            room_2d[49][y] === UNWALKABLE
        }
        x = 1
        for (; x < max; x += 1) {
            room_2d[x][0] === UNWALKABLE
            room_2d[x][49] === UNWALKABLE
        }
        return room_2d
    }


    class Graph {
        constructor(menge_v) {
            // Vertex count

            this.v = menge_v
            this.level = Array(menge_v)

            // Array: for every vertex an edge Array mit {v,r,c,f} vertex_to,res_edge,capacity,flow

            this.edges = Array(menge_v)
                .fill(0)
                .map(x => [])
        }
        New_edge(u, v, c) {
            this.edges[u].push({ v, r: this.edges[v].length, c, f: 0 }) // Normal forward Edge
            this.edges[v].push({ v: u, r: this.edges[u].length - 1, c: 0, f: 0 }) // reverse Edge for Residal Graph
        }

        Bfs(s, t) {
            // calculates Level Graph and if theres a path from s to t
            if (t >= this.v) return false
            this.level.fill(-1) // reset old levels
            this.level[s] = 0
            const q = [] // queue with s as starting point
            q.push(s)
            let u = 0
            let edge = null
            while (q.length) {
                u = q.splice(0, 1)[0]
                let i = 0
                const imax = this.edges[u].length
                for (; i < imax; i += 1) {
                    edge = this.edges[u][i]
                    if (this.level[edge.v] < 0 && edge.f < edge.c) {
                        this.level[edge.v] = this.level[u] + 1
                        q.push(edge.v)
                    }
                }
            }
            return this.level[t] >= 0 // return if theres a path to t -> no level, no path!
        }

        Dfsflow(u, f, t, c) {
            if (u === t)
                // Sink reached , aboard recursion
                return f
            let edge = null
            let flow_till_here = 0
            let flow_to_t = 0
            while (c[u] < this.edges[u].length) {
                // Visit all edges of the vertex  one after the other
                edge = this.edges[u][c[u]]
                if (this.level[edge.v] === this.level[u] + 1 && edge.f < edge.c) {
                    // Edge leads to Vertex with a level one higher, and has flow left
                    flow_till_here = Math.min(f, edge.c - edge.f)
                    flow_to_t = this.Dfsflow(edge.v, flow_till_here, t, c)
                    if (flow_to_t > 0) {
                        edge.f += flow_to_t // Add Flow to current edge
                        this.edges[edge.v][edge.r].f -= flow_to_t // subtract from reverse Edge -> Residual Graph neg. Flow to use backward direction of BFS/DFS
                        return flow_to_t
                    }
                }
                c[u] += 1
            }
            return 0
        }

        Bfsthecut(s) {
            const e_in_cut = []
            this.level.fill(-1)
            this.level[s] = 1
            const q = []
            q.push(s)
            let u = 0
            let edge = null
            while (q.length) {
                u = q.splice(0, 1)[0]
                let i = 0
                const imax = this.edges[u].length
                for (; i < imax; i += 1) {
                    edge = this.edges[u][i]
                    if (edge.f < edge.c) {
                        if (this.level[edge.v] < 1) {
                            this.level[edge.v] = 1
                            q.push(edge.v)
                        }
                    }
                    if (edge.f === edge.c && edge.c > 0) {
                        // blocking edge -> could be in min cut
                        edge.u = u
                        e_in_cut.push(edge)
                    }
                }
            }
            const min_cut = []
            let i = 0
            const imax = e_in_cut.length
            for (; i < imax; i += 1) {
                if (this.level[e_in_cut[i].v] === -1)
                    // Only edges which are blocking and lead to from s unreachable vertices are in the min cut
                    min_cut.push(e_in_cut[i].u)
            }
            return min_cut
        }

        Calcmincut(s, t) {
            if (s === t) return -1

            let returnValue = 0

            while (this.Bfs(s, t) === true) {
                const count = Array(this.v + 1).fill(0)
                let flow = 0

                do {
                    flow = this.Dfsflow(s, Number.MAX_VALUE, t, count)
                    if (flow > 0) returnValue += flow
                } while (flow)
            }

            return returnValue
        }
    }

    // Function to create Source, Sink, Tiles arrays: takes a rectangle-Array as input for Tiles that are to Protect

    function createGraph(roomName, rects) {
        // An Array with Terrain information: -1 not usable, 2 Sink (Leads to Exit)

        const positionValues = generadeRoomMatrix(roomName)

        // Loop through each rect

        for (const rect of rects) {
            // Loop through each pos inside the rect

            for (let x = rect.x1; x <= rect.x2; x += 1) {
                for (let y = rect.y1; y <= rect.y2; y += 1) {
                    // If the pos is NORMAL and on the edge of the rect

                    if (x === rect.x1 || x === rect.x2 || y === rect.y1 || y === rect.y2) {
                        // Set the pos to protected, and iterate

                        if (positionValues[x][y] === NORMAL) positionValues[x][y] = PROTECTED
                        continue
                    }

                    // Otherwise set the pos as unwalkable

                    positionValues[x][y] = UNWALKABLE
                }
            }
        }

        // If roomVisuals are enabled

        if (Memory.roomVisuals) {
            // Visualize position values

            for (let x = 0; x < constants.roomDimensions; x += 1) {
                for (let y = 0; y < constants.roomDimensions; y += 1) {
                    if (positionValues[x][y] === NORMAL) {
                        room.visual.rect(x - 0.5, y - 0.5, 1, 1, {
                            fill: '#e8e863',
                            opacity: 0.3,
                        })
                        continue
                    }

                    if (positionValues[x][y] === PROTECTED) {
                        room.visual.rect(x - 0.5, y - 0.5, 1, 1, {
                            fill: '#61975E',
                            opacity: 0.3,
                        })
                        continue
                    }
                }
            }
        }

        // initialise graph
        // possible 2*50*50 +2 (st) Vertices (Walls etc set to unused later)

        const g = new Graph(2 * 50 * 50 + 2)
        const infini = Number.MAX_VALUE
        const surr = [
            [0, -1],
            [-1, -1],
            [-1, 0],
            [-1, 1],
            [0, 1],
            [1, 1],
            [1, 0],
            [1, -1],
        ]
        // per Tile (0 in Array) top + bot with edge of c=1 from top to bott  (use every tile once!)
        // infini edge from bot to top vertices of adjacent tiles if they not protected (array =1) (no reverse edges in normal graph)
        // per prot. Tile (1 in array) Edge from source to this tile with infini cap.
        // per exit Tile (2in array) Edge to sink with infini cap.
        // source is at  pos 2*50*50, sink at 2*50*50+1 as first tile is 0,0 => pos 0
        // top vertices <-> x,y : v=y*50+x   and x= v % 50  y=v/50 (math.floor?)
        // bot vertices <-> top + 2500
        const source = 2 * 50 * 50
        const sink = 2 * 50 * 50 + 1
        let top = 0
        let bot = 0
        let dx = 0
        let dy = 0
        let x = 1
        let y = 1
        const max = 49
        for (; x < max; x += 1) {
            y = 1
            for (; y < max; y += 1) {
                top = y * 50 + x
                bot = top + 2500
                if (positionValues[x][y] === NORMAL) {
                    // normal Tile
                    g.New_edge(top, bot, 1)
                    for (let i = 0; i < 8; i += 1) {
                        dx = x + surr[i][0]
                        dy = y + surr[i][1]
                        if (positionValues[dx][dy] === NORMAL || positionValues[dx][dy] === TO_EXIT)
                            g.New_edge(bot, dy * 50 + dx, infini)
                    }
                } else if (positionValues[x][y] === PROTECTED) {
                    // protected Tile
                    g.New_edge(source, top, infini)
                    g.New_edge(top, bot, 1)
                    for (let i = 0; i < 8; i += 1) {
                        dx = x + surr[i][0]
                        dy = y + surr[i][1]
                        if (positionValues[dx][dy] === NORMAL || positionValues[dx][dy] === TO_EXIT)
                            g.New_edge(bot, dy * 50 + dx, infini)
                    }
                } else if (positionValues[x][y] === TO_EXIT) {
                    // near Exit
                    g.New_edge(top, sink, infini)
                }
            }
        }

        // graph finished
        return g
    }

    // Removes unneccary cut-tiles if bounds are set to include some 	dead ends

    function delete_tiles_to_dead_ends(roomName, cut_tiles_array) {
        // Get Terrain and set all cut-tiles as unwalkable

        const positionValues = generadeRoomMatrix(roomName)

        for (let i = cut_tiles_array.length - 1; i >= 0; i -= 1) {
            positionValues[cut_tiles_array[i].x][cut_tiles_array[i].y] = UNWALKABLE
        }

        // Floodfill from exits: save exit tiles in array and do a bfs-like search

        const unvisited_pos = []
        let y = 0
        const max = 49

        for (; y < max; y += 1) {
            if (positionValues[1][y] === TO_EXIT) unvisited_pos.push(50 * y + 1)
            if (positionValues[48][y] === TO_EXIT) unvisited_pos.push(50 * y + 48)
        }

        let x = 0

        for (; x < max; x += 1) {
            if (positionValues[x][1] === TO_EXIT) unvisited_pos.push(50 + x)
            if (positionValues[x][48] === TO_EXIT) unvisited_pos.push(2400 + x) // 50*48=2400
        }

        // Iterate over all unvisited TO_EXIT- Tiles and mark neigbours as TO_EXIT tiles, if walkable (NORMAL), and add to unvisited

        const surr = [
            [0, -1],
            [-1, -1],
            [-1, 0],
            [-1, 1],
            [0, 1],
            [1, 1],
            [1, 0],
            [1, -1],
        ]
        let index
        let dx
        let dy

        while (unvisited_pos.length > 0) {
            index = unvisited_pos.pop()
            x = index % 50
            y = Math.floor(index / 50)

            for (let i = 0; i < 8; i += 1) {
                dx = x + surr[i][0]
                dy = y + surr[i][1]
                if (positionValues[dx][dy] === NORMAL) {
                    unvisited_pos.push(50 * dy + dx)
                    positionValues[dx][dy] = TO_EXIT
                }
            }
        }
        // Remove min-Cut-Tile if there is no TO-EXIT  surrounding it
        let leads_to_exit = false
        for (let i = cut_tiles_array.length - 1; i >= 0; i -= 1) {
            leads_to_exit = false
            x = cut_tiles_array[i].x
            y = cut_tiles_array[i].y

            for (let i = 0; i < 8; i += 1) {
                dx = x + surr[i][0]
                dy = y + surr[i][1]
                if (positionValues[dx][dy] === TO_EXIT) {
                    leads_to_exit = true
                }
            }

            if (!leads_to_exit) {
                cut_tiles_array.splice(i, 1)
            }
        }
    }

    // Function for user: calculate min cut tiles from room, rect[]

    function GetCutTiles(roomName, rects) {
        const graph = createGraph(roomName, rects)
        if (!graph) return []

        // Position Source / Sink in Room-Graph

        const source = 2 * 50 * 50

        const sink = 2 * 50 * 50 + 1

        const positions = []
        const packedPositions = []

        if (graph.Calcmincut(source, sink) > 0) {
            const cut_edges = graph.Bfsthecut(source)

            // Get Positions from Edge

            let u
            let x
            let y
            let i = 0

            const imax = cut_edges.length

            for (; i < imax; i += 1) {
                u = cut_edges[i] // x= v % 50  y=v/50 (math.floor?)
                x = u % 50
                y = Math.floor(u / 50)

                positions.push({ x, y })
                packedPositions.push(pack({ x, y }))
            }
        }

        // if bounds are given,
        // try to dectect islands of walkable tiles, which are not conntected to the exits, and delete them from the cut-tiles

        if (positions.length > 0) delete_tiles_to_dead_ends(roomName, positions)

        return packedPositions
    }

    // Rectangle Array, the Rectangles will be protected by the returned tiles

    const protectionRects = []


    // Get the room's stampAnchors

    const { stampAnchors } = room.memory

    // Loop through types in stampAnchors

    for (const stampType in stampAnchors) {
        // Get the protectionOffset using the stampType

        const { protectionOffset } = stamps[stampType]

        // Loop through stampAnchor of this stampType's stampAnchors

        for (const packedStampAnchor of stampAnchors[stampType]) {
            const stampAnchor = unpackAsPos(packedStampAnchor)

            // Protect the stamp

            protectionRects.push({
                x1: Math.max(Math.min(stampAnchor.x - protectionOffset, constants.roomDimensions - 2), 2),
                y1: Math.max(Math.min(stampAnchor.y - protectionOffset, constants.roomDimensions - 2), 2),
                x2: Math.max(Math.min(stampAnchor.x + protectionOffset, constants.roomDimensions - 2), 2),
                y2: Math.max(Math.min(stampAnchor.y + protectionOffset, constants.roomDimensions - 2), 2),
            })
        }
    }

    const recordRamparts = !room.memory.stampAnchors.rampart.length

    // Get Min cut
    // Positions is an array where to build walls/ramparts

    const rampartPositions = recordRamparts
        ? GetCutTiles(room.name, protectionRects)
        : room.memory.stampAnchors.rampart

    // Get base planning data

    const roadCM = new CostMatrix = room.get('roadCM')

    // Plan the positions

    for (const packedPos of rampartPositions) {
        const pos = unpackAsPos(packedPos)

        // Record the pos in roadCM

        roadCM.set(pos.x, pos.y, 1)

        room.rampartPlans.set(pos.x, pos.y, 1)
    }

    // Get the hubAnchor

    const hubAnchor = unpackAsRoomPos(room.memory.stampAnchors.hub[0], room.name)

    // Group rampart positions

    const groupedRampartPositions = room.groupRampartPositions(rampartPositions, room.rampartPlans)

    // Loop through each group

    for (const group of groupedRampartPositions) {
        // Get the closest pos of the group by range to the anchor

        const closestPosToAnchor = hubAnchor.findClosestByPath(group, {
            ignoreCreeps: true,
            ignoreDestructibleStructures: true,
            ignoreRoads: true,
        })

        // Path from the hubAnchor to the cloestPosToAnchor

        const path = room.advancedFindPath({
            origin: closestPosToAnchor,
            goal: { pos: hubAnchor, range: 2 },
            weightCostMatrixes: [roadCM],
        })

        // Loop through positions of the path

        for (const pos of path) roadCM.set(pos.x, pos.y, 1)

        // Construct the onboardingIndex

        let onboardingIndex = 0

        // So long as there is a pos in path with an index of onboardingIndex

        while (path[onboardingIndex]) {
            // Get the pos in path with an index of onboardingIndex

            const onboardingPos = path[onboardingIndex]

            // If there are already rampart plans at this pos

            if (room.rampartPlans.get(onboardingPos.x, onboardingPos.y) === 1) {
                // Increase the onboardingIndex and iterate

                onboardingIndex += 1
                continue
            }

            // Record the pos in roadCM

            roadCM.set(onboardingPos.x, onboardingPos.y, 1)

            room.rampartPlans.set(onboardingPos.x, onboardingPos.y, 1)

            break
        }
    }

    // Loop through each tower anchor and plan for a rampart at it

    for (const packedStampAnchor of stampAnchors.tower) {
        const stampAnchor = unpackAsPos(packedStampAnchor)

        room.rampartPlans.set(stampAnchor.x, stampAnchor.y, 1)
    }

    // Protect fastFiller spawns

    room.rampartPlans.set(room.anchor.x - 2, room.anchor.y - 1, 1)

    room.rampartPlans.set(room.anchor.x + 2, room.anchor.y - 1, 1)

    room.rampartPlans.set(room.anchor.x, room.anchor.y + 2, 1)

    // Protect useful hub structures

    room.rampartPlans.set(hubAnchor.x + 1, hubAnchor.y - 1, 1)

    room.rampartPlans.set(hubAnchor.x - 1, hubAnchor.y + 1, 1)

    if (recordRamparts) {
        for (let x = 0; x < constants.roomDimensions; x += 1) {
            for (let y = 0; y < constants.roomDimensions; y += 1) {
                if (room.rampartPlans.get(x, y) === 1) room.memory.stampAnchors.rampart.push(pack({ x, y }))
            }
        }
    }

    // Inform true

    return true
}

/**
 * Maps positions for ramparts that enclose the base
 * @param {Tile[]} tiles 
 * @param {Room} room 
 */
function mapRampartsOld(tiles, room) {
    let baseTiles = tiles.filter(s =>
        s.structure != undefined
        && s.structure != STRUCTURE_ROAD
        && s.structure != STRUCTURE_CONTAINER
        && s.structure != STRUCTURE_EXTRACTOR
        && s.structure != STRUCTURE_LINK)




    const left = _.min(baseTiles, t => t.x).x
    const right = _.max(baseTiles, t => t.x).x
    const top = _.min(baseTiles, t => t.y).y
    const bottom = _.max(baseTiles, t => t.y).y

    const terrain = new Room.Terrain(room.name)
    const exits = Game.map.describeExits(room.name)//room.find(FIND_EXIT)
    let walls = []
    if (exits[5] != undefined) {
        // Bottom exit
        let yStart = bottom
        let yEnd = 47
        let counts = []
        for (let y = yStart; y <= yEnd; y++) {
            let count = 0
            for (let x = 0; x < 50; x++) {
                if (terrain.get(x, y) != TERRAIN_MASK_WALL) {
                    count++
                }
            }
            counts.push({
                row: y,
                count: count,
                border: 'bottom'
            })
        }
        walls.push(_.min(counts, c => c.count))
    }
    if (exits[7] != undefined) {
        // Left exit
        let xStart = left
        let xEnd = 2
        let yEnd = walls.find(w => w.border == 'bottom').row || 48
        let counts = []
        for (let x = xStart; x >= xEnd; x--) {
            let count = 0
            for (let y = 0; y < yEnd; y++) {
                if (terrain.get(x, y) != TERRAIN_MASK_WALL) {
                    count++
                }
            }
            counts.push({
                col: x,
                count: count,
                border: 'left'
            })
        }
        walls.push(_.min(counts, c => c.count))
    }

    if (exits[1] != undefined) {
        // Top exit
        let yStart = top
        let yEnd = 2
        let xStart = walls.find(w => w.border == 'left').col || 2
        let counts = []
        for (let y = yStart; y >= yEnd; y--) {
            let count = 0
            for (let x = xStart; x < 50; x++) {
                if (terrain.get(x, y) != TERRAIN_MASK_WALL) {
                    count++
                }
            }
            counts.push({
                row: y,
                count: count,
                border: 'top'
            })
        }
        walls.push(_.min(counts, c => c.count))
    }
    if (exits[3] != undefined) {
        // Right exit
        let xStart = right
        let xEnd = 48
        let yStart = walls.find(w => w.border == 'top').row || 2
        let yEnd = walls.find(w => w.border == 'bottom').row || 48
        let counts = []
        for (let x = xStart; x <= xEnd; x++) {
            let count = 0
            for (let y = yStart; y < yEnd; y++) {
                if (terrain.get(x, y) != TERRAIN_MASK_WALL) {
                    count++
                }
            }
            counts.push({
                col: x,
                count: count,
                border: 'right'
            })
        }
        walls.push(_.min(counts, c => c.count))
    }
    let bottomWall = walls.find(w => w.border == 'bottom')
    if (bottomWall) {
        let xStart = walls.find(w => w.border == 'left').col
        let xEnd = walls.find(w => w.border == 'right').col
        let yStart = bottom
        let yEnd = bottomWall.row
        let counts = []
        for (let y = yStart; y <= yEnd; y++) {
            let count = 0
            for (let x = xStart; x < xEnd; x++) {
                if (terrain.get(x, y) != TERRAIN_MASK_WALL) {
                    count++
                }
            }
            counts.push({
                row: y,
                count: count,
                border: 'bottom',
                start: xStart,
                end: xEnd
            })
        }
        let min = _.min(counts, c => c.count)
        if (min.count < bottomWall.count) {
            let idx = walls.findIndex(c => c.border == 'bottom')
            walls[idx] = min
        }
    }
    let leftWall = walls.find(w => w.border == 'left')
    if (leftWall) {
        let xStart = left
        let xEnd = walls.find(w => w.border == 'left').col
        let yStart = walls.find(w => w.border == 'top').row
        let yEnd = walls.find(w => w.border == 'bottom').row

        let counts = []
        for (let x = xStart; x >= xEnd; x--) {
            let count = 0
            for (let y = yStart; y < yEnd; y++) {
                if (terrain.get(x, y) != TERRAIN_MASK_WALL) {
                    count++
                }
            }
            counts.push({
                col: x,
                count: count,
                border: 'left',
                start: yStart,
                end: yEnd
            })
        }
        let min = _.min(counts, c => c.count)
        if (min.count < leftWall.count) {
            let idx = walls.findIndex(c => c.border == 'left')
            walls[idx] = min
        }

    }
    let topWall = walls.find(w => w.border == 'top')
    if (topWall) {
        let xStart = walls.find(w => w.border == 'left').col
        let xEnd = walls.find(w => w.border == 'right').col
        let yStart = topWall.row
        let yEnd = top
        let counts = []
        for (let y = yStart; y <= yEnd; y++) {
            let count = 0
            for (let x = xStart; x < xEnd; x++) {
                if (terrain.get(x, y) != TERRAIN_MASK_WALL) {
                    count++
                }
            }
            counts.push({
                row: y,
                count: count,
                border: 'top',
                start: xStart,
                end: xEnd
            })
        }
        let min = _.min(counts, c => c.count)
        if (min.count < topWall.count) {
            let idx = walls.findIndex(c => c.border == 'top')
            walls[idx] = min
        }

    }
    let rightWall = walls.find(w => w.border == 'right')
    if (rightWall) {
        let xStart = right
        let xEnd = walls.find(w => w.border == 'right').col
        let yStart = walls.find(w => w.border == 'top').row
        let yEnd = walls.find(w => w.border == 'bottom').row

        let counts = []
        for (let x = xStart; x <= xEnd; x++) {
            let count = 0
            for (let y = yStart; y < yEnd; y++) {
                if (terrain.get(x, y) != TERRAIN_MASK_WALL) {
                    count++
                }
            }
            counts.push({
                col: x,
                count: count,
                border: 'right',
                start: yStart,
                end: yEnd
            })
        }
        let min = _.min(counts, c => c.count)
        if (min.count < rightWall.count) {
            let idx = walls.findIndex(c => c.border == 'right')
            walls[idx] = min
        }
    }
    console.log(JSON.stringify(walls.map(w => w.col || w.row)), JSON.stringify(walls.map(w => w.count)), _.sum(walls, w => w.count))
    // Try and lower the total count
}

function countWalls(bottom, top, left, right, terrain) {
    let count = 0
    if (bottom > 49) {
        bottom = 49
    }
    if (top < 0)
        top = 0
    if (left < 0) {
        left = 0
    }
    if (right > 49) {
        right = 49
    }
    // bottom wall
    let xStart = left
    let xEnd = right
    let y = bottom
    for (let x = xStart; x < xEnd; x++) {
        if (terrain.get(x, y) != TERRAIN_MASK_WALL) {
            count++
        }
    }
    // top wall
    y = top
    for (let x = xStart; x < xEnd; x++) {
        if (terrain.get(x, y) != TERRAIN_MASK_WALL) {
            count++
        }
    }
    // left wall
    let yStart = top
    let yEnd = bottom
    let x = left
    for (let y = yStart; y < yEnd; y++) {
        if (terrain.get(x, y) != TERRAIN_MASK_WALL) {
            count++
        }
    }
    // right wall
    x = right
    for (let y = yStart; y < yEnd; y++) {
        if (terrain.get(x, y) != TERRAIN_MASK_WALL) {
            count++
        }
    }
    return count
}

/**
 * Maps positions for ramparts that enclose the base
 * @param {Tile[]} tiles 
 * @param {Room} room 
 */
function mapRamparts3(tiles, room) {
    let baseTiles = tiles.filter(s =>
        s.structure != undefined
        && s.structure != STRUCTURE_ROAD
        && s.structure != STRUCTURE_CONTAINER
        && s.structure != STRUCTURE_EXTRACTOR
        && s.structure != STRUCTURE_LINK)



    const terrain = new Room.Terrain(room.name)
    const left = _.min(baseTiles, t => t.x).x - 1
    const right = _.max(baseTiles, t => t.x).x + 1
    const top = _.min(baseTiles, t => t.y).y - 1
    const bottom = _.max(baseTiles, t => t.y).y + 1
    let count = countWalls(bottom, top, left, right, terrain)
    let best = {
        bottom: bottom,
        top: top,
        left: left,
        right: right,
        count: count
    }
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
            for (let k = 0; k < 6; k++) {
                for (let l = 0; l < 6; l++) {

                    count = countWalls(bottom + i, top - j, left - k, right + l, terrain)
                    if (count < best.count) {
                        best.bottom = bottom + i
                        best.top = top - j
                        best.left = left - k
                        best.right = right + l
                        best.count = count
                    }
                }
            }
        }
    }
    console.log(JSON.stringify(best))
    updateRampartTiles(best)
}

module.exports = mapRamparts