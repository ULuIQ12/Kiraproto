import { FXRandomBool, FXRandomIntBetween } from "@liamegan1/fxhash-helpers";
import { Vector2 } from "three";

enum CellType
{
    Undef, 
    HorizontalRoad,
    VerticalRoad,
    CrossingRoad,
    Building,
    Park,
}

class CityCell // a rectangle mostly, width methods to self subdivide. Values unit is tiles
{
    
    x:number = 0; //in tiles
    y:number = 0; //in tiles
    width:number = 1.0; //in tiles
    height:number = 1.0; // in tiles
    buildingHeight:number = 0.0;
    type:CellType = CellType.Undef;


    constructor(x:number, y:number, width:number, height:number, type:CellType = CellType.Undef)
    {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
    }

    // CreateRoads :
    // subdivide in long stripes, with a pass for each direction and a special tile type for crossings
    // return an array containing the new cells
    CreateRoads():CityCell[]
    {
        const minSpaceBetweenRoads:number= 2; // in tiles
        const roadChance:number = 0.1; // over 1
        const roadWidth:number = 1.0 // in tiles

        // vertical partition
        let px:number=0;
        const outCellsV:CityCell[] = [];
        let lastRoadX:number = 0;
        while( px < this.width) // for the width of the cell
        {
            if( FXRandomBool(roadChance) )
            {
                const dx = px - lastRoadX;
                if( dx > 0 )
                {
                    const undefCell:CityCell = new CityCell(lastRoadX, 0, dx, this.height);
                    outCellsV.push( undefCell);
                }
                const roadCell:CityCell = new CityCell(px, 0, roadWidth, this.height, CellType.VerticalRoad);
                px +=roadWidth;
                lastRoadX = px;
                outCellsV.push( roadCell);
                px +=minSpaceBetweenRoads;                
            }
            else 
                px ++;
        }
        
        if( this.width - lastRoadX > 0)
        {
            const endCell:CityCell = new CityCell(lastRoadX, 0, this.width - lastRoadX, this.height);
            outCellsV.push( endCell);
        }

        // horizontal partition and crossings
        let py:number = 0;
        let lastRoadY:number = 0;
        const outCellsH:CityCell[] = [];
        while(py<this.height)
        {
            if( FXRandomBool(roadChance) )
            {
                const dy = py - lastRoadY;
                for( let i=0;i<outCellsV.length;i++)
                {
                    const cell:CityCell = outCellsV[i];
                    if( dy > 0 )
                    {
                        if( cell.type == CellType.Undef)
                        {
                            const undefCell:CityCell = new CityCell(cell.x, lastRoadY, cell.width, dy);
                            outCellsH.push( undefCell);
                        }
                        else  // is a vertical road
                        {
                            const vCell:CityCell = new CityCell(cell.x, lastRoadY, cell.width, dy, CellType.VerticalRoad);
                            outCellsH.push( vCell);
                        }
                    }
                    if( cell.type == CellType.Undef) // undef become a horizontal road
                    {
                        const roadCell:CityCell = new CityCell(cell.x, py, cell.width, roadWidth, CellType.HorizontalRoad);
                        outCellsH.push( roadCell);
                    }
                    else // is a vertical road, so crossing
                    {
                        const roadCell:CityCell = new CityCell(cell.x, py, cell.width, roadWidth, CellType.CrossingRoad);
                        outCellsH.push( roadCell);
                    }

                }
                py += roadWidth;
                lastRoadY = py;
                py += minSpaceBetweenRoads;
            }
            else 
            {
                py ++;
            }
        }
        if( this.height - lastRoadY > 0 )
        {
            const dy = this.height - lastRoadY;
            for( let i=0;i<outCellsV.length;i++)
            {
                const cell:CityCell = outCellsV[i];
                if( cell.type == CellType.Undef)
                {
                    const undefCell:CityCell = new CityCell(cell.x, lastRoadY, cell.width, dy);
                    outCellsH.push( undefCell);
                }
                else  // is a vertical road
                {
                    const vCell:CityCell = new CityCell(cell.x, lastRoadY, cell.width, dy, CellType.VerticalRoad);
                    outCellsH.push( vCell);
                }
            }
        }
        


        return outCellsH;
    }

    // CreateBuildings
    // Sudvide a cell into buildings and occasional park
    // return an array containing the new cells
    CreateBuildings():CityCell[]
    {
        let outcells:CityCell[] = [this];
        const minSize:number = 3;
        const parkChance:number = 0.25;
        // iteratively split cells in two, vertically or horizontally, if larger than minsize
        // can probably be written nicer
        let iter:number = 16;
        while( iter > 0)
        {
            let sub:CityCell[] = [];
            for(let i=0;i<outcells.length;i++)
            {
                const r:CityCell = outcells[i];
                if( FXRandomBool(0.5))
                {
                    if(r.width > minSize )
                    {
                        sub = sub.concat( r.sub(true) );
                    }
                    else if(  r.height > minSize )
                    {
                        sub = sub.concat( r.sub(false) );
                    }
                    else
                    {
                        sub = sub.concat( r );
                    }
                }
                else
                {
                    if(r.height > minSize )
                    {
                        sub = sub.concat( r.sub(false) );
                    }
                    else if(  r.width > minSize )
                    {
                        sub = sub.concat( r.sub(true) );
                    }
                    else
                    {
                        sub = sub.concat( r );
                    }
                }

            }
            
            outcells.splice(0, outcells.length);
            for( let i=0;i<sub.length;i++)
            {
                outcells.push( sub[i]);
            }
            iter -- ;
        }

        // Set cell new types        
        for( let i=0;i<outcells.length;i++)
        {
            if( FXRandomBool(parkChance))
                outcells[i].type = CellType.Park;    
            else
                outcells[i].type = CellType.Building; 
                
        }
        return outcells;
    }

    // split cell in two, vetically or horizontally
    sub(splitDir:boolean = false ):CityCell[]
    {
        if( (this.width < 2 && splitDir) || (this.height < 2 && !splitDir) )
        {
            console.log("Can't subdivide, too small, shouldn't be called!")
            return [this];
        }
        // choosing a random cut point
        const pt:Vector2 = new Vector2(
            this.x + FXRandomIntBetween(1, this.width), 
            this.y + FXRandomIntBetween(1, this.height)
        );

        const dir:boolean = splitDir;
        let r1:CityCell;
        let r2:CityCell;
        if( dir )
        {
            r1 = new CityCell(this.x, this.y, pt.x - this.x, this.height);
            r2 = new CityCell(pt.x, this.y, this.x + this.width - pt.x, this.height);
        }
        else 
        {
            r1 = new CityCell(this.x, this.y, this.width, pt.y - this.y);
            r2 = new CityCell(this.x, pt.y, this.width, this.y + this.height - pt.y);
        }
        return [r1, r2];
    }
}
export {CityCell, CellType};