//-----------------------------------------------
// testing...
//-----------------------------------------------
import spacetimedb from "../module";
//-----------------------------------------------
// shop list
//-----------------------------------------------
export const shop_check_inventory = spacetimedb.reducer({},(ctx,{})=>{
  console.log("check shop inventory");
});