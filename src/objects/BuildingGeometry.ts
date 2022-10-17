import { BufferGeometry, Float32BufferAttribute, Vector2, Vector3, Color } from "three";


class BuildingGeometry extends BufferGeometry // three examples on using 
{
    // exposing this method from parent class
    translate:any;

    // values defined in world space units
    constructor(width:number = 1, height = 1, depth:number = 1, margin:number = 0.1, recessW:number = 0.1, recessH:number = 0.1, vertexColor:Color = new Color() )
    {
        super();
        const positions:number[] = [];
        const indices:number[] = [];
        const normals:number[] = []; // not used, using the automatic method instead
        const uvs:number[] = [];
        const colors:number[] = [];
        const center:Vector2 = new Vector2(width / 2 , depth / 2);
        const sideWalk:number = margin *0.1;
        const sizing:number[] = [];
        const sizeInfo:Vector3 = new Vector3(width, height, depth);
        const heights:number[] = [0,    sideWalk,   sideWalk,   height,     height,             height - recessH];
        const widths:number[] =  [0,    0,          margin,     margin,     margin + recessW,   margin + recessW];
        const vert:Vector3 = new Vector3();

        for( let i=1;i<widths.length;i++)
        {
            for( let j=0;j<4;j++)
            {
                // each face of the building of the building has its own 4 vertices
                // 
                const xmod:number = (j<2)?-1:1; // -1, -1, 1, 1 
                const ymod:number = (Math.abs(j-1.5)>1)?-1:1; // -1, 1, 1, -1

                const prev:number = (j==0)?3:(j-1);
                const prevxmod:number = (prev<2)?-1:1;
                const prevymod:number = (Math.abs(prev-1.5)>1)?-1:1;
                
                vert.x = center.x  + (width/2 - widths[i-1]) * xmod;
                vert.y = heights[i-1];
                vert.z = center.y + (depth/2 - widths[i-1]) * ymod;

                positions.push( vert.x, vert.y, vert.z);
                this.AddUvsAt(i, j, width, height, depth, vert, uvs);

                vert.x = center.x  + (width/2 - widths[i]) * xmod;
                vert.y = heights[i];
                vert.z = center.y + (depth/2 - widths[i]) * ymod;

                positions.push( vert.x, vert.y, vert.z);
                this.AddUvsAt(i, j, width, height, depth, vert, uvs);

                vert.x = center.x  + (width/2 - widths[i-1]) * prevxmod;
                vert.y = heights[i-1];
                vert.z = center.y + (depth/2 - widths[i-1]) * prevymod;

                positions.push( vert.x, vert.y, vert.z);
                this.AddUvsAt(i, j, width, height, depth, vert, uvs);

                vert.x = center.x  + (width/2 - widths[i]) * prevxmod;
                vert.y = heights[i];
                vert.z = center.y + (depth/2 - widths[i]) * prevymod;

                positions.push( vert.x, vert.y, vert.z);
                this.AddUvsAt(i, j, width, height, depth, vert, uvs);

                const i0:number = (i-1) * 16 + j*4;
                const i1:number = i0 + 1;
                const i2:number = i0 + 2;
                const i3:number = i0 + 3;

                indices.push( i0, i1, i2);
                indices.push( i2, i1, i3);

                for( let k=0;k<4;k++)
                {
                    colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
                    sizing.push( sizeInfo.x, sizeInfo.y, sizeInfo.z);
                }
                
            }
        }
        // roof vertices
        for( let j=0;j<4;j++) 
        {
            // duplicating le last 4 for the roof quad
            const xmod:number = (j<2)?-1:1;
            const ymod:number = (Math.abs(j-1.5)>1)?-1:1;
            const i:number = widths.length -1 ;
            vert.x = center.x  + (width/2 - widths[i]) * xmod;
            vert.y = heights[i];
            vert.z = center.y + (depth/2 - widths[i]) * ymod;
            uvs.push(vert.x / width, vert.z / depth);
            positions.push(vert.x, vert.y, vert.z);
            colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
            sizing.push( sizeInfo.x, sizeInfo.y, sizeInfo.z);
        }
        // roof faces
        const l:number = Math.floor(  positions.length / 3 ) ;
        indices.push( l-3, l-2, l-1, l-3, l-1, l-4); // using  the vertices just created at the end of the array
        

        super.setIndex( indices);
        super.setAttribute("position", new Float32BufferAttribute(positions, 3));
        super.setAttribute("color", new Float32BufferAttribute(colors, 3));
        super.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
        super.setAttribute("sizing", new Float32BufferAttribute(sizing, 3));
        super.computeVertexNormals();
        
    }

    // uvs ares set differently on vertices depending on whether they belong to horizontal or verticals faces
    AddUvsAt(i:number, j:number, width:number, height:number, depth:number, vert:Vector3, uvs:number[])
    {
        if( i%2==0) // horizontals
        {
            uvs.push(vert.x / width, vert.z / depth); 
        }
        else // verticals
        {
            if( j%2==0) // north-south or east-west
            {
                uvs.push(vert.x / width, vert.y / height);
            }
            else
            {
                uvs.push(vert.z / depth, vert.y / height);
                
            }
        }
    }
}

export {BuildingGeometry};