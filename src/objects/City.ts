import { FXRandomBetween, FXRandomBool, FXRandomIntBetween } from "@liamegan1/fxhash-helpers";
import { AmbientLight, BoxGeometry, BufferAttribute, BufferGeometry, Color, DirectionalLight, Float32BufferAttribute, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, OrthographicCamera, PlaneGeometry, PointLight, Vector2, Vector3 } from "three"
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';
import { BuildingMaterial } from "../materials/BuildingMaterial";
import { PeopleMaterial } from "../materials/PeopleMaterial";
import { RoadMaterial } from "../materials/RoadMaterial";
import { TreeMaterial } from "../materials/TreeMaterial";
import { SceneManager } from "../utils/SceneManager";
import { BuildingGeometry } from "./BuildingGeometry";
import { CellType, CityCell } from "./cityhelpers/CityCell";
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
class CityConfig // helper class to centralize some datas about the city
{
    // tried to gauge for a similar density to your wip
    // shadows must be sized accordingly ( see ResizeShadowCam() )
    width:number = 200; // must be pair for the raod shader to work
    height:number = 200; // same
    // these two should probably stay at 1 as it allows for some tricks
    tileW:number = 1;
    tileH:number = 1;

    halfW:number;
    halfH:number;
    halfTileW:number;
    halfTileH:number;

    groundColor:Color = new Color().setHSL(0,0,1);

    constructor()
    {
        this.updateMeasures();   
    }
    updateMeasures() // always useful to store some halves
    {
        this.halfW = this.width * 0.5;
        this.halfH = this.height * 0.5;
        this.halfTileW = this.tileW * 0.5;
        this.halfTileH = this.tileH * 0.5;
    }

}

class City extends Group
{
    showGrid:boolean = false;

    static instance:City;
    position:Vector3;
    grid:Mesh;
    config:CityConfig;
    cells:CityCell[];
    constructor(config:CityConfig = new CityConfig())
    {
        super();
        City.instance = this;

        this.config = config;
        this.BuildGrid();
        this.CreateGround();        
        this.CreateCells();
        this.BuildRoads();
        this.BuildBuildings();
        this.AddTreesAndPeople();
        this.AddLighting();

        this.initGUI();

    }

    /**
     * Just a plane
     */
    CreateGround()
    {
        const ground:Mesh = new Mesh( new PlaneGeometry(this.config.width, this.config.height, 1, 1), new MeshStandardMaterial({color:this.config.groundColor, depthTest:false}));
        ground.position.x = this.config.halfW;
        ground.position.z = this.config.halfH;
        ground.receiveShadow = true; // !SHADOW!
        ground.rotateX( -Math.PI / 2 );
        ground.renderOrder = -10000;
        super.add( ground );
    }

    BuildGrid()
    {
        const gridMateral:MeshBasicMaterial = new MeshBasicMaterial({color:0x000000, depthWrite:false, depthTest:false});
        const c:CityConfig = this.config;
        const linePoints:Vector3[] = [
            new Vector3(0,0,0),
            new Vector3(c.width, 0,0),
        ];
        const lineGeom:BufferGeometry = new PlaneGeometry(c.width, 0.01, 1,1);
        lineGeom.rotateX(-Math.PI / 2);
        lineGeom.translate(c.width / 2 , 0 , 0);
        const tx:number = c.width / c.tileW;
        const ty:number = c.height / c.tileH;
        const toMerge:BufferGeometry[] = [];
        for( let i=0;i<tx;i++)
        {
            const horizontal:BufferGeometry = lineGeom.clone();
            horizontal.translate(0, 0, i*c.tileH);
            toMerge.push(horizontal);
        }
        for( let i=0;i<ty;i++)
        {
            const vertical:BufferGeometry = lineGeom.clone();
            vertical.rotateY(-Math.PI/2);
            vertical.translate(i*c.tileW, 0, 0);
            toMerge.push(vertical);
        }
        const merged:BufferGeometry = BufferGeometryUtils.mergeBufferGeometries(toMerge, false);
        this.grid = new Mesh(merged, gridMateral);
        this.grid.renderOrder = 10000;
        this.grid.visible = this.showGrid;
        super.add( this.grid );
    }

    // Create rectangular cells by subdivisions, probably pretty similar to what you do
    CreateCells()
    {
        const c:CityConfig = this.config;
        const nbCellsW:number = Math.floor( c.width / c.tileW );
        const nbCellsH:number = Math.floor( c.height / c.tileH);
        const baseCell:CityCell = new CityCell(0,0, nbCellsW, nbCellsH);

        // Adding roads
        const roadCells:CityCell[] = baseCell.CreateRoads();
        this.cells = roadCells;
        
        // filling cells that are not roads
        const noParkChange:number = 0.9;
        let tempCells:CityCell[] = [];
        let bcells:CityCell[] = [];
        for( let i=0;i<this.cells.length;i++)
        {
            const cell:CityCell = this.cells[i];
            // not a road os either a block of buildings , or a park
            if( cell.type == CellType.Undef )
            {
                if(FXRandomBool(noParkChange) )
                {
                    const buildingCells:CityCell[] = cell.CreateBuildings();
                    bcells = bcells.concat( buildingCells );
                }
                else
                {
                    cell.type = CellType.Park;
                    tempCells.push(cell);
                }
            }
            // if it's a road, just push it back in
            else
                tempCells.push(cell);
        }
        this.cells = tempCells.concat(bcells);

    }

    /**
     * Create road geometry in road tiles
     * using 3 different meshes for the the 3 types of road, and 3 different materials
     */
    BuildRoads()
    {
        const roadBaseColor = new Color().setHSL(0,0,0.5);
        const VRoadMat:MeshStandardMaterial = new RoadMaterial({color:roadBaseColor}, 1);
        const HRoadMat:MeshStandardMaterial = new RoadMaterial({color:roadBaseColor}, 2);
        const CrossRoadMat:MeshStandardMaterial = new RoadMaterial({color:roadBaseColor}, 0);

        const VRoads:BufferGeometry[] = [];
        const HRoads:BufferGeometry[] = [];
        const CRoads:BufferGeometry[] = [];

        for( let i=0;i<this.cells.length;i++) // looking for road cells
        {
            
            const cell:CityCell = this.cells[i];
            
            if( cell.type == CellType.VerticalRoad)
            {                
                const sizeX:number = cell.width * this.config.tileW;
                const sizeY:number = cell.height * this.config.tileH;
                const geom:PlaneGeometry = new PlaneGeometry(sizeX,sizeY , 1,1);
                geom.translate(sizeX/2, -sizeY/2, 0);
                geom.rotateX(-Math.PI / 2 );
                geom.translate(cell.x * this.config.tileW, 0, cell.y * this.config.tileH);
                VRoads.push( geom );
            }
            else if( cell.type == CellType.HorizontalRoad)
            {
                const sizeX:number = cell.width * this.config.tileW;
                const sizeY:number = cell.height * this.config.tileH;
                const geom:PlaneGeometry = new PlaneGeometry(sizeX,sizeY , 1,1);
                geom.translate(sizeX/2, -sizeY/2, 0);
                geom.rotateX(-Math.PI / 2 );
                geom.translate(cell.x * this.config.tileW, 0, cell.y * this.config.tileH);
                HRoads.push( geom );
            }
            else if( cell.type == CellType.CrossingRoad)
            {
                const sizeX:number = cell.width * this.config.tileW;
                const sizeY:number = cell.height * this.config.tileH;
                const geom:PlaneGeometry = new PlaneGeometry(sizeX,sizeY , 1,1);
                geom.translate(sizeX/2, -sizeY/2, 0);
                geom.rotateX(-Math.PI / 2 );
                geom.translate(cell.x * this.config.tileW, 0, cell.y * this.config.tileH);
                CRoads.push( geom );
            }
        }
        // merging the geometrys
        const VMerge:BufferGeometry = BufferGeometryUtils.mergeBufferGeometries(VRoads);
        const HMerge:BufferGeometry = BufferGeometryUtils.mergeBufferGeometries(HRoads);
        const CMerge:BufferGeometry = BufferGeometryUtils.mergeBufferGeometries(CRoads);

        // creating the meshes
        const VMesh:Mesh = new Mesh(VMerge, VRoadMat);
        VMesh.receiveShadow = true; // !SHADOW!
        const HMesh:Mesh = new Mesh(HMerge, HRoadMat);
        HMesh.receiveShadow = true; // !SHADOW!
        const CMesh:Mesh = new Mesh(CMerge, CrossRoadMat);
        CMesh.receiveShadow = true; // !SHADOW!

        super.add(VMesh, HMesh, CMesh);
    }

    // Create geometries for the buldings in the appropriate cells
    BuildBuildings()
    {
        const c:CityConfig = this.config;
        const buildings:BufferGeometry[] = [];

        for( let i=0;i<this.cells.length;i++) // looking ofr buildings
        {
            const cell:CityCell = this.cells[i];
            if( cell.type != CellType.Building)
                continue;

            // some sizing. These could be randomized.
            const buildingSideWalkSize:number = c.tileW * 0.25;
            const buildingTopRecessWidth:number = c.tileW * 0.1;
            const buildingTopRecesHeight:number = c.tileW * 0.1;
            // random height and color
            const buildHeightBase:number = Math.pow( FXRandomBetween(0,1), 10.0 );
            const buildingHeight:number = 1 + Math.floor( buildHeightBase * 10);
            const colMod:number = Math.pow( FXRandomBetween(0,1), 0.5);
            const col:Color = new Color().setHSL(0, 0, 0.5 + colMod * 0.5);
            // creating geom with cell data
            const bWidth:number = cell.width * c.tileW;
            const bHeight:number = c.tileW * buildingHeight;
            const bDepth:number = cell.height * c.tileH;
            const geom:BuildingGeometry = new BuildingGeometry(bWidth, bHeight, bDepth, buildingSideWalkSize, buildingTopRecessWidth, buildingTopRecesHeight, col);
            geom.translate( cell.x, 0, cell.y);
            buildings.push( geom );

            // a bit hacky, saving this data in the cell to later place people on roofs
            cell.buildingHeight = bHeight;

            // adding antennas here, would probably be cleaner in BuildingGeometry
            const nbAntennas:number = FXRandomIntBetween(0,3);
            for( let k=0;k<nbAntennas;k++)
            {
                const antenna:BufferGeometry = this.GetAntenna(cell, bWidth, bHeight, bDepth, col, buildingTopRecesHeight);
                buildings.push( antenna );
            }
            
            
        }
        // Merging for performances
        const BMerge:BufferGeometry = BufferGeometryUtils.mergeBufferGeometries(buildings);
        const buildingMat:BuildingMaterial = new BuildingMaterial({color:0xFFFFFF, wireframe:false, flatShading:false, vertexColors:true});
        const bMesh:Mesh = new Mesh(BMerge, buildingMat);
        // !SHADOW!
        // the buildings are the main shadow casters and receivers, so its enabled here
        bMesh.castShadow = true;
        bMesh.receiveShadow = true;
        super.add( bMesh );
    }

    // generate antenna geometry. Would probably be way more efficient to generate a few and clone those
    GetAntenna(cell:CityCell, baseWidth:number, baseHeight:number, baseDepth:number, color:Color, recessH:number):BufferGeometry
    {
        const c:CityConfig = this.config;
        const antennaW:number = c.tileW * FXRandomBetween(0.1, 0.25);
        const antennaD:number = c.tileH * FXRandomBetween(0.1, 0.25);
        const antennaH:number = c.tileW * FXRandomBetween(0.1, 1.0);
        const geom:BoxGeometry = new BoxGeometry(antennaW, antennaH, antennaD, 1,1,1);
        const positions:BufferAttribute = geom.attributes.position as BufferAttribute;
        const uvs:BufferAttribute = geom.attributes.uv as BufferAttribute;
        const sizings:number[] = [];
        const colors:number[] = [];
        const v2:Vector2 = new Vector2();
        for( let j=0;j<positions.count;j++)
        {
            colors.push( color.r, color.g, color.b);
            sizings.push(baseWidth, baseHeight, baseDepth);

            v2.fromBufferAttribute(uvs, j);
            uvs.setXY(j, v2.x, v2.y + 1); // offseting the uvs so that the shader doesn't draw windows there / see shader
        }
        uvs.needsUpdate = true;
        geom.setAttribute("sizing", new Float32BufferAttribute(sizings, 3));
        geom.setAttribute("color", new Float32BufferAttribute(colors, 3));
        const posOffsetRangeX:number = ((cell.width * c.tileW) * 0.5 ) * 0.5;
        const posOffsetRangeZ:number = ((cell.height * c.tileH) * 0.5 ) * 0.5;
        const randOffset:Vector2 = new Vector2( FXRandomBetween(-posOffsetRangeX, posOffsetRangeX), FXRandomBetween(-posOffsetRangeZ, posOffsetRangeZ));
        geom.translate(cell.x + c.tileW * cell.width / 2 + randOffset.x, baseHeight + antennaH * 0.5 - recessH , cell.y + c.tileH * cell.height / 2 + randOffset.y);

        return geom;
    }

    /** 
     * Create Planes for trees and little people 
     * using InstancedMesh here, to demonstrate, and maybe thinking the little people could be animated     * 
     */
    AddTreesAndPeople()
    {
        // using quads. Could be more complex geometry
        const treeGeom:BufferGeometry = new PlaneGeometry(1,1,1,1);
        treeGeom.translate(0, 0.5, 0);

        const peopleGeom:BufferGeometry = new PlaneGeometry(0.3,0.3,1,1);
        peopleGeom.translate(0, 0.15, 0);

        // some custom material/shaders to draw the shapes on the quads
        const treeMat:TreeMaterial = new TreeMaterial({color:new Color().setHSL(0,0,1.0)});
        const peopleMat:TreeMaterial = new PeopleMaterial({color:new Color().setHSL(0,0,1.0)});
        
        // big buffers
        const nbTrees:number = 10000;
        const nbPeople:number = 16000;
        const treeMesh:InstancedMesh = new InstancedMesh(treeGeom, treeMat, nbTrees);
        const peopleMesh:InstancedMesh = new InstancedMesh(peopleGeom, peopleMat, nbTrees);

        const dummy:Object3D = new Object3D();
        const Axis:Vector3 = new Vector3(0,1,0);
        const baseCol:Color = new Color();
        const cellPosition:Vector2 = new Vector2();
        const cellSize:Vector2 = new Vector2();
        const cellCenter:Vector2 = new Vector2();
        const marginTrees:number = this.config.tileW * 0.5;
        const marginPeople:number = this.config.tileW * 0.05;

        let total:number = 0 ;
        let totalPeople:number = 0 ;

        for( let i=0;i<this.cells.length;i++) // looking for cells to put trees / people, with various rules
        {
            const cell:CityCell = this.cells[i];
            cellPosition.set(cell.x * this.config.tileW,cell.y * this.config.tileH);
            cellSize.set(cell.width * this.config.tileW, cell.height * this.config.tileH);
            cellCenter.set( cellPosition.x + cellSize.x * 0.5, cellPosition.y + cellSize.y * 0.5);
            
            if( cell.type == CellType.Park)
            {
                const rest:number = nbTrees - total;
                
                const alloc:number = Math.min( rest, (cell.width * cell.height) * 2.0 ); // trying to allocate proportional to cell size vs total buffer size
                for( let j=0;j<alloc;j++)
                {
                    dummy.scale.set( 1.0, FXRandomBetween(0.5, 1.5), 1.0);
                    dummy.setRotationFromAxisAngle(Axis, Math.PI / 4);
                    dummy.position.y = 0 
                    dummy.position.x = FXRandomBetween(cellCenter.x - (cellSize.x*0.5 - marginTrees), cellCenter.x + (cellSize.x*0.5 - marginTrees) );
                    dummy.position.z = FXRandomBetween(cellCenter.y - (cellSize.y*0.5 - marginTrees), cellCenter.y + (cellSize.y*0.5 - marginTrees) );
                    dummy.updateMatrix();
                    treeMesh.setMatrixAt(total, dummy.matrix);
                    treeMesh.setColorAt(total, baseCol.setHSL(0,0,FXRandomBetween(0.2, 0.5)))
                    total ++ ;
                }
            }
            else if( cell.type == CellType.CrossingRoad || cell.type == CellType.HorizontalRoad || cell.type == CellType.VerticalRoad)
            {
                const rest:number = nbPeople - totalPeople;
                const alloc:number = Math.min( rest, (cell.width * cell.height) * 2.0 ); // trying to allocate proportional to cell size vs total buffer size
                for( let j=0;j<alloc;j++)
                {
                    dummy.scale.set( 1.0, 1.0, 1.0);
                    dummy.setRotationFromAxisAngle(Axis, Math.PI / 4);
                    dummy.position.y = 0 
                    dummy.position.x = FXRandomBetween(cellCenter.x - (cellSize.x*0.5 - marginPeople), cellCenter.x + (cellSize.x*0.5 - marginPeople) );
                    dummy.position.z = FXRandomBetween(cellCenter.y - (cellSize.y*0.5 - marginPeople), cellCenter.y + (cellSize.y*0.5 - marginPeople) );
                    dummy.updateMatrix();
                    peopleMesh.setMatrixAt(totalPeople, dummy.matrix);
                    peopleMesh.setColorAt(totalPeople, baseCol.setHSL(0,0,FXRandomBetween(0.025, 0.1)))
                    totalPeople ++ ;
                }
            }
            
        }
        // !SHADOW!
        // The receive part is OK, but the casting is not very useful here, 
        // the objects are too small compared to the shadowmap sizing, plus they're flat.
        // Left on to demonstrate, but should probably be off
        treeMesh.receiveShadow = true;
        treeMesh.castShadow = true;
        peopleMesh.receiveShadow = true;
        peopleMesh.castShadow = true;
        super.add( treeMesh);
        super.add( peopleMesh);
    }

    dirLight:DirectionalLight;
    pointLight:PointLight;
    ambient:AmbientLight;
    /**
     * Here the meat of what your shadows will look like
     * For this project, as people in the thread mentionned, it's probably not worth it as 
     * Still, they look good from afar
     * 
     * Of course, this is all realtime techniques, there are many other ways to do shadows that are not realtime
     */
    AddLighting()
    {
        this.ambient = new AmbientLight(0xFFFFFF, 0.5);
        super.add( this.ambient );
           

        const bw:number =  SceneManager.instance.orthoCamSize / 2 *  SceneManager.instance.aspect;
        const dirLight:DirectionalLight = new DirectionalLight(0xFFFFFF, 2);
        dirLight.castShadow = true;
        // 4096*4096 is big
        dirLight.shadow.mapSize.width = 4096;
        dirLight.shadow.mapSize.height = 4096;
        dirLight.shadow.camera.near =-250;
        dirLight.shadow.camera.far = 250;
        dirLight.shadow.blurSamples = 8;
        dirLight.shadow.bias = -0.001;

        dirLight.position.set(-2 + this.config.halfW, 5, 3 + this.config.halfH);
        super.add( dirLight );

        this.dirLight = dirLight;
           

        const plsize:number = Math.min(this.config.width, this.config.height) * 0.75;
        const pl:PointLight = new PointLight(0xFFFFFF, 3.0, plsize, 1.0);
        pl.castShadow  =true;
        // shadow are set up differently
        pl.shadow.mapSize.width = 2048;
        pl.shadow.mapSize.height = 2048;
        pl.shadow.camera.near =0.001;
        pl.shadow.camera.far = 10;
        pl.shadow.blurSamples = 8;
        
        pl.position.set(this.config.halfW + this.config.width * 0.25, plsize /4,this.config.halfH + this.config.height * 0.25);
        //super.add(pl);
        this.pointLight = pl;
    }

    ResizeShadowCam(factor:number)
    {
        // this is not very dynamic, should take the city size into account
        const mulx:number = 6.5 ;
        const muly:number = 5 ;
        this.dirLight.shadow.camera.left = -factor * mulx;
        this.dirLight.shadow.camera.right = factor * mulx;
        this.dirLight.shadow.camera.top = -factor * muly;
        this.dirLight.shadow.camera.bottom = factor * muly;

    }

    /**
     * Some controls to play with
     */
    gui:GUI;
    lightParams:any =  {
        dirLightX:-1,
        dirLightY:0.5, 
        dirLightZ:1,
        pointLight:false,
        pointLightX:0.25,
        pointLightY:0.25,
        pointLightZ:0.25,
    }
    initGUI()
    {
        this.gui = new GUI({width:256});

        this.gui.add( this.lightParams, 'dirLightX', -1.0, 1.0).onChange( function ( value ) {
            City.instance.updateLightParams();
        } );
        this.gui.add( this.lightParams, 'dirLightY', 0.0, 1.0).onChange( function ( value ) {
            City.instance.updateLightParams();
        } );
        this.gui.add( this.lightParams, 'dirLightZ', -1.0, 1.0).onChange( function ( value ) {
            City.instance.updateLightParams();
        } );

        this.gui.add( this.lightParams, 'pointLight').onChange( function ( value ) {
            City.instance.updateLightParams();
        } );

        this.gui.add( this.lightParams, 'pointLightX', -1.0, 1.0).onChange( function ( value ) {
            City.instance.updateLightParams();
        } );
        this.gui.add( this.lightParams, 'pointLightY', 0.0, 1.0).onChange( function ( value ) {
            City.instance.updateLightParams();
        } );
        this.gui.add( this.lightParams, 'pointLightZ', -1.0, 1.0).onChange( function ( value ) {
            City.instance.updateLightParams();
        } );

        this.gui.open();
    }

    updateLightParams()
    {

        if( this.lightParams.pointLight)
        {
            if( this.dirLight.parent != undefined)
                super.remove(this.dirLight);
            if( this.pointLight.parent == undefined)
                super.add( this.pointLight);

            this.ambient.intensity = 0.1;

            

            this.pointLight.position.x =  this.config.halfW*4/3 - this.lightParams.pointLightX * 50.0;
            this.pointLight.position.y =  this.lightParams.pointLightY * 50.0;
            this.pointLight.position.z =  this.config.halfH*4/3 - this.lightParams.pointLightZ * 50.0;
            
        }
        else 
        {
            if( this.dirLight.parent == undefined)
                super.add(this.dirLight);
            if( this.pointLight.parent != undefined)
                super.remove( this.pointLight);

            this.ambient.intensity = 0.5;

            
            this.dirLight.position.x =  this.config.halfW - this.lightParams.dirLightX * 2.0;
            this.dirLight.position.y =  this.lightParams.dirLightY * 3.0;
            this.dirLight.position.z =  this.config.halfH - this.lightParams.dirLightZ * 2.0;
        }


    }

    
}
export {City}