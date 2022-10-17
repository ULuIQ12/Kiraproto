
import { Color, Scene, OrthographicCamera, WebGLRenderer, ACESFilmicToneMapping, Vector2, Vector3, PCFSoftShadowMap} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import { SSAARenderPass } from 'three/examples/jsm/postprocessing/SSAARenderPass';
import Stats from 'three/examples/jsm/libs/stats.module'

import { City } from '../objects/City';

/**
 * Handles renderer setup, camera, scene , resizing and animation
 * City created in this.initScene()
 */
class SceneManager 
{

    static instance:SceneManager;
    container:HTMLElement;
    renderer:WebGLRenderer;
    composer:EffectComposer;
    scene:Scene;
    camera:OrthographicCamera;
    stats:any = Stats();
    
    controls:OrbitControls;
    ssaaPass:SSAARenderPass;
    
    orthoCamSize:number = 30;
    aspect:number = 1.333333;
    

    constructor()
    {
        SceneManager.instance = this;
        this.container = document.createElement("div");
        this.container.id = "container";
        this.container.style.backgroundColor = '#000000';
        document.body.prepend(this.container);
        
        this.stats.dom.style.display = "none";
        document.body.appendChild(this.stats.dom);

        this.initRenderer();
        this.initCamera();
        this.initControls();
        this.initScene();
        this.initComposer();   
             
        this.onResize();
    }


    initRenderer()
    {
        this.renderer = new WebGLRenderer({powerPreference:"high-performance"});
        
        this.renderer.toneMapping = ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        // !SHADOW!
        this.renderer.shadowMap.enabled = true; // needs to be enabled
        this.renderer.shadowMap.type = PCFSoftShadowMap; // various options here, see documentation
        
        this.container.appendChild( this.renderer.domElement);
        this.renderer.domElement.id = "renderer";
        
    }

    
    initComposer()
    {
        const rsize:Vector2 = new Vector2();
        this.renderer.getSize(rsize);

        // Some antialising. SSAA is quite costly, but looks good, try with sample level 2 to 4
        this.ssaaPass = new SSAARenderPass(this.scene, this.camera,0, 1.0);
        this.ssaaPass.setSize(rsize.x, rsize.y);
        this.ssaaPass.unbiased = true;
        this.ssaaPass.sampleLevel = 1;

        this.composer = new EffectComposer(this.renderer);
        this.composer.setPixelRatio(1);
        this.composer.addPass( this.ssaaPass);        
    }

    initCamera()
    {
        const cdist:number = this.orthoCamSize;        
        this.camera = new OrthographicCamera(-cdist, cdist, cdist, -cdist, -200, 200); // maybe try with PerspectiveCamera to see how easy it is to switch
        const cpos:Vector3 = new Vector3(10,5,10);
        this.camera.position.copy(cpos);
        this.camera.lookAt(0,0,0);
    }

    initControls()
    {        
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.panSpeed = 1;
        this.controls.rotateSpeed = 1;
        this.controls.zoomSpeed = 2;
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;        
        this.controls.target = new Vector3(0,0,0);        
        this.controls.update();        
    }

    mycity:City;
    initScene()
    {
        this.scene = new Scene();
        this.scene.background = new Color(0xFFFFFF);
        
        const city:City = new City();
        city.position.set(-city.config.halfW, 0.0, -city.config.halfH); // centering 
        this.scene.add( city);
        this.mycity = city;
    }
    
    animate(dt:number, elapsed:number)
    {
        this.controls.update();
        this.composer.render();         

        if( this.stats != undefined )
            this.stats.update();
        
    }

    onResize(fw:number = 1, fh:number = 1)
    {
        
        let mw:number = window.innerWidth;
        let mh:number = window.innerHeight;
        this.aspect = mw / mh;
        
        let bw:number,bh:number;
        if( this.aspect > 1 )
        {
            bw = this.orthoCamSize * this.aspect;
            bh = this.orthoCamSize  ;
        }
        else 
        {
            bw = this.orthoCamSize ;
            bh = this.orthoCamSize  / this.aspect;
        }
        const wratio = mw /mh;

        this.camera.left = -bw;
        this.camera.right = bw;
        this.camera.top = bh;
        this.camera.bottom = -bh;

        let dx, dy;        
        if( wratio > this.aspect)
        {
            dx = this.aspect * mh;
            dy = mh;
        }
        else 
        {

            dx = mw;
            dy = mw  / this.aspect;
        }
        
        
        this.container.style.width = dx + "px";
        this.container.style.height = dy + "px";
        
        this.renderer.setSize(dx, dy);        
        this.composer.setSize(dx, dy);
        this.renderer.setPixelRatio( 1 );
        this.camera.updateProjectionMatrix();

        if( this.mycity != undefined)
        {
            // !SHADOW! 
            // passing some size infos to apdat the lights
            const bw2:number = this.orthoCamSize / 2 * this.aspect;
            this.mycity.ResizeShadowCam(bw2);
        }   
    }

}

export {SceneManager};