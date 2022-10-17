import { FXInit } from "@liamegan1/fxhash-helpers";
import { Clock } from "three";
import { SceneManager } from "./utils/SceneManager";

// typescript declaration of fxhash stuff , and initialization of Liam Egan Fxhash wrapper
declare var fxhash: string;
declare var isFxpreview: boolean;
declare function fxrand(): any;
FXInit( fxrand );

const clock:Clock = new Clock(true);
const sm = new SceneManager();

window.addEventListener('resize', OnResize);
animate();

function animate()
{
    const dt = clock.getDelta();
    const elapsed = clock.getElapsedTime();    
    sm.animate(dt, elapsed);    
    requestAnimationFrame( animate );    
}

function OnResize()
{
    sm.onResize();
}



