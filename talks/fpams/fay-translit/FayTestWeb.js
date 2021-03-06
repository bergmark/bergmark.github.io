/*******************************************************************************
 * Misc.
 */

// Workaround for missing functionality in IE 8 and earlier.
if( Object.create === undefined ) {
  Object.create = function( o ) {
    function F(){}
    F.prototype = o;
    return new F();
  };
}

// Insert properties of b in place into a.
function Fay$$objConcat(a,b){
  for (var p in b) if (b.hasOwnProperty(p)){
    a[p] = b[p];
  }
  return a;
}

/*******************************************************************************
 * Thunks.
 */

// Force a thunk (if it is a thunk) until WHNF.
function Fay$$_(thunkish,nocache){
  while (thunkish instanceof Fay$$$) {
    thunkish = thunkish.force(nocache);
  }
  return thunkish;
}

// Apply a function to arguments (see method2 in Fay.hs).
function Fay$$__(){
  var f = arguments[0];
  for (var i = 1, len = arguments.length; i < len; i++) {
    f = (f instanceof Fay$$$? Fay$$_(f) : f)(arguments[i]);
  }
  return f;
}

// Thunk object.
function Fay$$$(value){
  this.forced = false;
  this.value = value;
}

// Force the thunk.
Fay$$$.prototype.force = function(nocache) {
  return nocache ?
    this.value() :
    (this.forced ?
     this.value :
     (this.value = this.value(), this.forced = true, this.value));
};


function Fay$$seq(x) {
  return function(y) {
    Fay$$_(x,false);
    return y;
  }
}

function Fay$$seq$36$uncurried(x,y) {
  Fay$$_(x,false);
  return y;
}

/*******************************************************************************
 * Monad.
 */

function Fay$$Monad(value){
  this.value = value;
}

// This is used directly from Fay, but can be rebound or shadowed. See primOps in Types.hs.
// >>
function Fay$$then(a){
  return function(b){
    return Fay$$bind(a)(function(_){
      return b;
    });
  };
}

// This is used directly from Fay, but can be rebound or shadowed. See primOps in Types.hs.
// >>
function Fay$$then$36$uncurried(a,b){
  return Fay$$bind$36$uncurried(a,function(_){ return b; });
}

// >>=
// This is used directly from Fay, but can be rebound or shadowed. See primOps in Types.hs.
function Fay$$bind(m){
  return function(f){
    return new Fay$$$(function(){
      var monad = Fay$$_(m,true);
      return Fay$$_(f)(monad.value);
    });
  };
}

// >>=
// This is used directly from Fay, but can be rebound or shadowed. See primOps in Types.hs.
function Fay$$bind$36$uncurried(m,f){
  return new Fay$$$(function(){
    var monad = Fay$$_(m,true);
    return Fay$$_(f)(monad.value);
  });
}

// This is used directly from Fay, but can be rebound or shadowed.
function Fay$$$_return(a){
  return new Fay$$Monad(a);
}

// Allow the programmer to access thunk forcing directly.
function Fay$$force(thunk){
  return function(type){
    return new Fay$$$(function(){
      Fay$$_(thunk,type);
      return new Fay$$Monad(Fay$$unit);
    })
  }
}

// This is used directly from Fay, but can be rebound or shadowed.
function Fay$$return$36$uncurried(a){
  return new Fay$$Monad(a);
}

// Unit: ().
var Fay$$unit = null;

/*******************************************************************************
 * Serialization.
 * Fay <-> JS. Should be bijective.
 */

// Serialize a Fay object to JS.
function Fay$$fayToJs(type,fayObj){
  var base = type[0];
  var args = type[1];
  var jsObj;
  if(base == "action") {
    // A nullary monadic action. Should become a nullary JS function.
    // Fay () -> function(){ return ... }
    jsObj = function(){
      return Fay$$fayToJs(args[0],Fay$$_(fayObj,true).value);
    };

  }
  else if(base == "function") {
    // A proper function.
    jsObj = function(){
      var fayFunc = fayObj;
      var return_type = args[args.length-1];
      var len = args.length;
      // If some arguments.
      if (len > 1) {
        // Apply to all the arguments.
        fayFunc = Fay$$_(fayFunc,true);
        // TODO: Perhaps we should throw an error when JS
        // passes more arguments than Haskell accepts.

        // Unserialize the JS values to Fay for the Fay callback.
        if (args == "automatic_function")
        {
          for (var i = 0; i < arguments.length; i++) {
            fayFunc = Fay$$fayToJs(["automatic"], Fay$$_(fayFunc(Fay$$jsToFay(["automatic"],arguments[i])),true));
          }
          return fayFunc;
        }

        for (var i = 0, len = len; i < len - 1 && fayFunc instanceof Function; i++) {
          fayFunc = Fay$$_(fayFunc(Fay$$jsToFay(args[i],arguments[i])),true);
        }
        // Finally, serialize the Fay return value back to JS.
        var return_base = return_type[0];
        var return_args = return_type[1];
        // If it's a monadic return value, get the value instead.
        if(return_base == "action") {
          return Fay$$fayToJs(return_args[0],fayFunc.value);
        }
        // Otherwise just serialize the value direct.
        else {
          return Fay$$fayToJs(return_type,fayFunc);
        }
      } else {
        throw new Error("Nullary function?");
      }
    };

  }
  else if(base == "string") {
    jsObj = Fay$$fayToJs_string(fayObj);
  }
  else if(base == "list") {
    // Serialize Fay list to JavaScript array.
    var arr = [];
    fayObj = Fay$$_(fayObj);
    while(fayObj instanceof Fay$$Cons) {
      arr.push(Fay$$fayToJs(args[0],fayObj.car));
      fayObj = Fay$$_(fayObj.cdr);
    }
    jsObj = arr;
  }
  else if(base == "tuple") {
    // Serialize Fay tuple to JavaScript array.
    var arr = [];
    fayObj = Fay$$_(fayObj);
    var i = 0;
    while(fayObj instanceof Fay$$Cons) {
      arr.push(Fay$$fayToJs(args[i++],fayObj.car));
      fayObj = Fay$$_(fayObj.cdr);
    }
    jsObj = arr;

  }
  else if(base == "defined") {
    fayObj = Fay$$_(fayObj);
    if (fayObj instanceof Fay.FFI._Undefined) {
      jsObj = undefined;
    } else {
      jsObj = Fay$$fayToJs(args[0],fayObj.slot1);
    }

  }
  else if(base == "nullable") {
    fayObj = Fay$$_(fayObj);
    if (fayObj instanceof Fay.FFI._Null) {
      jsObj = null;
    } else {
      jsObj = Fay$$fayToJs(args[0],fayObj.slot1);
    }

  }
  else if(base == "double" || base == "int" || base == "bool") {
    // Bools are unboxed.
    jsObj = Fay$$_(fayObj);

  }
  else if(base == "ptr" || base == "unknown")
    return fayObj;
  else if(base == "automatic" || base == "user") {

    fayObj = Fay$$_(fayObj);

    if(fayObj instanceof Function) {
      jsObj = Fay$$fayToJs(["function", "automatic_function"], fayObj);
    } else if(fayObj instanceof Fay$$Cons || fayObj === null){
      // Serialize Fay list to JavaScript array.
      var arr = [];
      while(fayObj instanceof Fay$$Cons) {
        arr.push(Fay$$fayToJs(["automatic"],fayObj.car));
        fayObj = Fay$$_(fayObj.cdr);
      }
      jsObj = arr;
    } else {
      var fayToJsFun = fayObj && fayObj.constructor && Fay$$fayToJsHash[fayObj.constructor.name];
      jsObj = fayToJsFun ? fayToJsFun(type,type[2],fayObj) : fayObj;
    }
  }
  else
    throw new Error("Unhandled Fay->JS translation type: " + base);
  return jsObj;
}

// Stores the mappings from fay types to js objects.
// This will be populated by compiled modules.
var Fay$$fayToJsHash = {};

// Specialized serializer for string.
function Fay$$fayToJs_string(fayObj){
  // Serialize Fay string to JavaScript string.
  var str = "";
  fayObj = Fay$$_(fayObj);
  while(fayObj instanceof Fay$$Cons) {
    str += Fay$$_(fayObj.car);
    fayObj = Fay$$_(fayObj.cdr);
  }
  return str;
};
function Fay$$jsToFay_string(x){
  return Fay$$list(x)
};

// Special num/bool serializers.
function Fay$$jsToFay_int(x){return x;}
function Fay$$jsToFay_double(x){return x;}
function Fay$$jsToFay_bool(x){return x;}

function Fay$$fayToJs_int(x){return Fay$$_(x);}
function Fay$$fayToJs_double(x){return Fay$$_(x);}
function Fay$$fayToJs_bool(x){return Fay$$_(x);}

// Unserialize an object from JS to Fay.
function Fay$$jsToFay(type,jsObj){
  var base = type[0];
  var args = type[1];
  var fayObj;
  if(base == "action") {
    // Unserialize a "monadic" JavaScript return value into a monadic value.
    fayObj = new Fay$$Monad(Fay$$jsToFay(args[0],jsObj));
  }
  else if(base == "function") {
    // Unserialize a function from JavaScript to a function that Fay can call.
    // So
    //
    //    var f = function(x,y,z){ … }
    //
    // becomes something like:
    //
    //    function(x){
    //      return function(y){
    //        return function(z){
    //          return new Fay$$$(function(){
    //            return Fay$$jsToFay(f(Fay$$fayTojs(x),
    //                                  Fay$$fayTojs(y),
    //                                  Fay$$fayTojs(z))
    //    }}}}};
    var returnType = args[args.length-1];
    var funArgs = args.slice(0,-1);

    if (jsObj.length > 0) {
      var makePartial = function(args){
        return function(arg){
          var i = args.length;
          var fayArg = Fay$$fayToJs(funArgs[i],arg);
          var newArgs = args.concat([fayArg]);
          if(newArgs.length == funArgs.length) {
            return new Fay$$$(function(){
              return Fay$$jsToFay(returnType,jsObj.apply(this,newArgs));
            });
          } else {
            return makePartial(newArgs);
          }
        };
      };
      fayObj = makePartial([]);
    }
    else {
      fayObj =
        function (arg)
        {
           return Fay$$jsToFay(["automatic"], jsObj(Fay$$fayToJs(["automatic"], arg)));
        };
    }
  }
  else if(base == "string") {
    // Unserialize a JS string into Fay list (String).
    fayObj = Fay$$list(jsObj);
  }
  else if(base == "list") {
    // Unserialize a JS array into a Fay list ([a]).
    var serializedList = [];
    for (var i = 0, len = jsObj.length; i < len; i++) {
      // Unserialize each JS value into a Fay value, too.
      serializedList.push(Fay$$jsToFay(args[0],jsObj[i]));
    }
    // Pop it all in a Fay list.
    fayObj = Fay$$list(serializedList);

  }
  else if(base == "tuple") {
    // Unserialize a JS array into a Fay tuple ((a,b,c,...)).
    var serializedTuple = [];
    for (var i = 0, len = jsObj.length; i < len; i++) {
      // Unserialize each JS value into a Fay value, too.
      serializedTuple.push(Fay$$jsToFay(args[i],jsObj[i]));
    }
    // Pop it all in a Fay list.
    fayObj = Fay$$list(serializedTuple);

  }
  else if(base == "defined") {
    if (jsObj === undefined) {
      fayObj = new Fay.FFI._Undefined();
    } else {
      fayObj = new Fay.FFI._Defined(Fay$$jsToFay(args[0],jsObj));
    }

  }
  else if(base == "nullable") {
    if (jsObj === null) {
      fayObj = new Fay.FFI._Null();
    } else {
      fayObj = new Fay.FFI.Nullable(Fay$$jsToFay(args[0],jsObj));
    }

  }
  else if(base == "int") {
    // Int are unboxed, so there's no forcing to do.
    // But we can do validation that the int has no decimal places.
    // E.g. Math.round(x)!=x? throw "NOT AN INTEGER, GET OUT!"
    fayObj = Math.round(jsObj);
    if(fayObj!==jsObj) throw "Argument " + jsObj + " is not an integer!";

  }
  else if (base == "double" ||
           base == "bool" ||
           base ==  "ptr" ||
           base ==  "unknown") {
    return jsObj;
  }
  else if(base == "automatic" || base == "user") {
    if (jsObj && jsObj['instance']) {
      var jsToFayFun = Fay$$jsToFayHash[jsObj["instance"]];
      fayObj = jsToFayFun ? jsToFayFun(type,type[2],jsObj) : jsObj;
    }
    else if (jsObj instanceof Array) {
      var list = null;
      for (var i = jsObj.length - 1; i >= 0; i--) {
        list = new Fay$$Cons(Fay$$jsToFay([base], jsObj[i]), list);
      }
      fayObj = list;
    }
    else if (jsObj instanceof Function) {
      var type = [["automatic"]];
      for (var i = 0; i < jsObj.length; i++)
        type.push(["automatic"]);
      return Fay$$jsToFay(["function", type], jsObj);
    }
    else
      fayObj = jsObj;

  }
  else { throw new Error("Unhandled JS->Fay translation type: " + base); }
  return fayObj;
}

// Stores the mappings from js objects to fay types.
// This will be populated by compiled modules.
var Fay$$jsToFayHash = {};

/*******************************************************************************
 * Lists.
 */

// Cons object.
function Fay$$Cons(car,cdr){
  this.car = car;
  this.cdr = cdr;
}

// Make a list.
function Fay$$list(xs){
  var out = null;
  for(var i=xs.length-1; i>=0;i--)
    out = new Fay$$Cons(xs[i],out);
  return out;
}

// Built-in list cons.
function Fay$$cons(x){
  return function(y){
    return new Fay$$Cons(x,y);
  };
}

// List index.
// `list' is already forced by the time it's passed to this function.
// `list' cannot be null and `index' cannot be out of bounds.
function Fay$$index(index,list){
  for(var i = 0; i < index; i++) {
    list = Fay$$_(list.cdr);
  }
  return list.car;
}

// List length.
// `list' is already forced by the time it's passed to this function.
function Fay$$listLen(list,max){
  for(var i = 0; list !== null && i < max + 1; i++) {
    list = Fay$$_(list.cdr);
  }
  return i == max;
}

/*******************************************************************************
 * Numbers.
 */

// Built-in *.
function Fay$$mult(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) * Fay$$_(y);
    });
  };
}

function Fay$$mult$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) * Fay$$_(y);
  });

}

// Built-in +.
function Fay$$add(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) + Fay$$_(y);
    });
  };
}

// Built-in +.
function Fay$$add$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) + Fay$$_(y);
  });

}

// Built-in -.
function Fay$$sub(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) - Fay$$_(y);
    });
  };
}
// Built-in -.
function Fay$$sub$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) - Fay$$_(y);
  });

}

// Built-in /.
function Fay$$divi(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) / Fay$$_(y);
    });
  };
}

// Built-in /.
function Fay$$divi$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) / Fay$$_(y);
  });

}

/*******************************************************************************
 * Booleans.
 */

// Are two values equal?
function Fay$$equal(lit1, lit2) {
  // Simple case
  lit1 = Fay$$_(lit1);
  lit2 = Fay$$_(lit2);
  if (lit1 === lit2) {
    return true;
  }
  // General case
  if (lit1 instanceof Array) {
    if (lit1.length != lit2.length) return false;
    for (var len = lit1.length, i = 0; i < len; i++) {
      if (!Fay$$equal(lit1[i], lit2[i])) return false;
    }
    return true;
  } else if (lit1 instanceof Fay$$Cons && lit2 instanceof Fay$$Cons) {
    do {
      if (!Fay$$equal(lit1.car,lit2.car))
        return false;
      lit1 = Fay$$_(lit1.cdr), lit2 = Fay$$_(lit2.cdr);
      if (lit1 === null || lit2 === null)
        return lit1 === lit2;
    } while (true);
  } else if (typeof lit1 == 'object' && typeof lit2 == 'object' && lit1 && lit2 &&
             lit1.constructor === lit2.constructor) {
    for(var x in lit1) {
      if(!(lit1.hasOwnProperty(x) && lit2.hasOwnProperty(x) &&
           Fay$$equal(lit1[x],lit2[x])))
        return false;
    }
    return true;
  } else {
    return false;
  }
}

// Built-in ==.
function Fay$$eq(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$equal(x,y);
    });
  };
}

function Fay$$eq$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$equal(x,y);
  });

}

// Built-in /=.
function Fay$$neq(x){
  return function(y){
    return new Fay$$$(function(){
      return !(Fay$$equal(x,y));
    });
  };
}

// Built-in /=.
function Fay$$neq$36$uncurried(x,y){

  return new Fay$$$(function(){
    return !(Fay$$equal(x,y));
  });

}

// Built-in >.
function Fay$$gt(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) > Fay$$_(y);
    });
  };
}

// Built-in >.
function Fay$$gt$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) > Fay$$_(y);
  });

}

// Built-in <.
function Fay$$lt(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) < Fay$$_(y);
    });
  };
}


// Built-in <.
function Fay$$lt$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) < Fay$$_(y);
  });

}


// Built-in >=.
function Fay$$gte(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) >= Fay$$_(y);
    });
  };
}

// Built-in >=.
function Fay$$gte$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) >= Fay$$_(y);
  });

}

// Built-in <=.
function Fay$$lte(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) <= Fay$$_(y);
    });
  };
}

// Built-in <=.
function Fay$$lte$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) <= Fay$$_(y);
  });

}

// Built-in &&.
function Fay$$and(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) && Fay$$_(y);
    });
  };
}

// Built-in &&.
function Fay$$and$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) && Fay$$_(y);
  });
  ;
}

// Built-in ||.
function Fay$$or(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) || Fay$$_(y);
    });
  };
}

// Built-in ||.
function Fay$$or$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) || Fay$$_(y);
  });

}

/*******************************************************************************
 * Mutable references.
 */

// Make a new mutable reference.
function Fay$$Ref(x){
  this.value = x;
}

// Write to the ref.
function Fay$$writeRef(ref,x){
  ref.value = x;
}

// Get the value from the ref.
function Fay$$readRef(ref,x){
  return ref.value;
}

/*******************************************************************************
 * Dates.
 */
function Fay$$date(str){
  return window.Date.parse(str);
}

/*******************************************************************************
 * Application code.
 */

var Data = {};
Data.Data = {};
var Fay = {};
Fay.FFI = {};
Fay.FFI._Nullable = function Nullable(slot1){
  this.slot1 = slot1;
};
Fay.FFI.Nullable = function(slot1){
  return new Fay$$$(function(){
    return new Fay.FFI._Nullable(slot1);
  });
};
Fay.FFI._Null = function Null(){
};
Fay.FFI.Null = new Fay$$$(function(){
  return new Fay.FFI._Null();
});
Fay.FFI._Defined = function Defined(slot1){
  this.slot1 = slot1;
};
Fay.FFI.Defined = function(slot1){
  return new Fay$$$(function(){
    return new Fay.FFI._Defined(slot1);
  });
};
Fay.FFI._Undefined = function Undefined(){
};
Fay.FFI.Undefined = new Fay$$$(function(){
  return new Fay.FFI._Undefined();
});
Fay$$objConcat(Fay$$fayToJsHash,{"Nullable": function(type,argTypes,_obj){
  var obj_ = {"instance": "Nullable"};
  var obj_slot1 = Fay$$fayToJs(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],_obj.slot1);
  if (undefined !== obj_slot1) {
    obj_['slot1'] = obj_slot1;
  }
  return obj_;
},"Null": function(type,argTypes,_obj){
  var obj_ = {"instance": "Null"};
  return obj_;
},"Defined": function(type,argTypes,_obj){
  var obj_ = {"instance": "Defined"};
  var obj_slot1 = Fay$$fayToJs(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],_obj.slot1);
  if (undefined !== obj_slot1) {
    obj_['slot1'] = obj_slot1;
  }
  return obj_;
},"Undefined": function(type,argTypes,_obj){
  var obj_ = {"instance": "Undefined"};
  return obj_;
}});
Fay$$objConcat(Fay$$jsToFayHash,{"Nullable": function(type,argTypes,obj){
  return new Fay.FFI._Nullable(Fay$$jsToFay(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],obj["slot1"]));
},"Null": function(type,argTypes,obj){
  return new Fay.FFI._Null();
},"Defined": function(type,argTypes,obj){
  return new Fay.FFI._Defined(Fay$$jsToFay(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],obj["slot1"]));
},"Undefined": function(type,argTypes,obj){
  return new Fay.FFI._Undefined();
}});
var Prelude = {};
Prelude._Just = function Just(slot1){
  this.slot1 = slot1;
};
Prelude.Just = function(slot1){
  return new Fay$$$(function(){
    return new Prelude._Just(slot1);
  });
};
Prelude._Nothing = function Nothing(){
};
Prelude.Nothing = new Fay$$$(function(){
  return new Prelude._Nothing();
});
Prelude._Left = function Left(slot1){
  this.slot1 = slot1;
};
Prelude.Left = function(slot1){
  return new Fay$$$(function(){
    return new Prelude._Left(slot1);
  });
};
Prelude._Right = function Right(slot1){
  this.slot1 = slot1;
};
Prelude.Right = function(slot1){
  return new Fay$$$(function(){
    return new Prelude._Right(slot1);
  });
};
Prelude.maybe = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        if (Fay$$_($p3) instanceof Prelude._Nothing) {
          var m = $p1;
          return m;
        }
        if (Fay$$_($p3) instanceof Prelude._Just) {
          var x = Fay$$_($p3).slot1;
          var f = $p2;
          return Fay$$_(f)(x);
        }
        throw ["unhandled case in maybe",[$p1,$p2,$p3]];
      });
    };
  };
};
Prelude.$62$$62$$61$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$_(Fay$$bind($p1)($p2));
    });
  };
};
Prelude.$62$$62$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$_(Fay$$then($p1)($p2));
    });
  };
};
Prelude.$_return = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$return(Fay$$fayToJs(["unknown"],$p1))));
  });
};
Prelude.fail = new Fay$$$(function(){
  return Prelude.error;
});
Prelude.when = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var m = $p2;
      var p = $p1;
      return Fay$$_(p) ? Fay$$_(Fay$$_(Fay$$then)(m))(Fay$$_(Fay$$$_return)(Fay$$unit)) : Fay$$_(Fay$$$_return)(Fay$$unit);
    });
  };
};
Prelude.forM_ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var m = $p2;
      var $tmp1 = Fay$$_($p1);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        return Fay$$_(Fay$$_(Fay$$then)(Fay$$_(m)(x)))(Fay$$_(Fay$$_(Prelude.forM_)(xs))(m));
      }
      if (Fay$$_($p1) === null) {
        return Fay$$_(Fay$$$_return)(Fay$$unit);
      }
      throw ["unhandled case in forM_",[$p1,$p2]];
    });
  };
};
Prelude.mapM_ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var m = $p1;
        return Fay$$_(Fay$$_(Fay$$then)(Fay$$_(m)(x)))(Fay$$_(Fay$$_(Prelude.mapM_)(m))(xs));
      }
      if (Fay$$_($p2) === null) {
        return Fay$$_(Fay$$$_return)(Fay$$unit);
      }
      throw ["unhandled case in mapM_",[$p1,$p2]];
    });
  };
};
Prelude.$61$$60$$60$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var x = $p2;
      var f = $p1;
      return Fay$$_(Fay$$_(Fay$$bind)(x))(f);
    });
  };
};
Prelude.sequence = function($p1){
  return new Fay$$$(function(){
    var ms = $p1;
    return (function(){
      var k = function($p1){
        return function($p2){
          return new Fay$$$(function(){
            var m$39$ = $p2;
            var m = $p1;
            return Fay$$_(Fay$$_(Fay$$bind)(m))(function($p1){
              var x = $p1;
              return Fay$$_(Fay$$_(Fay$$bind)(m$39$))(function($p1){
                var xs = $p1;
                return Fay$$_(Fay$$$_return)(Fay$$_(Fay$$_(Fay$$cons)(x))(xs));
              });
            });
          });
        };
      };
      return Fay$$_(Fay$$_(Fay$$_(Prelude.foldr)(k))(Fay$$_(Fay$$$_return)(null)))(ms);
    })();
  });
};
Prelude.sequence_ = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return Fay$$_(Fay$$$_return)(Fay$$unit);
    }
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      var m = $tmp1.car;
      var ms = $tmp1.cdr;
      return Fay$$_(Fay$$_(Fay$$then)(m))(Fay$$_(Prelude.sequence_)(ms));
    }
    throw ["unhandled case in sequence_",[$p1]];
  });
};
Prelude._GT = function GT(){
};
Prelude.GT = new Fay$$$(function(){
  return new Prelude._GT();
});
Prelude._LT = function LT(){
};
Prelude.LT = new Fay$$$(function(){
  return new Prelude._LT();
});
Prelude._EQ = function EQ(){
};
Prelude.EQ = new Fay$$$(function(){
  return new Prelude._EQ();
});
Prelude.compare = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var y = $p2;
      var x = $p1;
      return Fay$$_(Fay$$_(Fay$$_(Fay$$gt)(x))(y)) ? Prelude.GT : Fay$$_(Fay$$_(Fay$$_(Fay$$lt)(x))(y)) ? Prelude.LT : Prelude.EQ;
    });
  };
};
Prelude.succ = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Fay$$_(Fay$$add)(x))(1);
  });
};
Prelude.pred = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Fay$$_(Fay$$sub)(x))(1);
  });
};
Prelude.enumFrom = function($p1){
  return new Fay$$$(function(){
    var i = $p1;
    return Fay$$_(Fay$$_(Fay$$cons)(i))(Fay$$_(Prelude.enumFrom)(Fay$$_(Fay$$_(Fay$$add)(i))(1)));
  });
};
Prelude.enumFromTo = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var n = $p2;
      var i = $p1;
      return Fay$$_(Fay$$_(Fay$$_(Fay$$gt)(i))(n)) ? null : Fay$$_(Fay$$_(Fay$$cons)(i))(Fay$$_(Fay$$_(Prelude.enumFromTo)(Fay$$_(Fay$$_(Fay$$add)(i))(1)))(n));
    });
  };
};
Prelude.enumFromBy = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var by = $p2;
      var fr = $p1;
      return Fay$$_(Fay$$_(Fay$$cons)(fr))(Fay$$_(Fay$$_(Prelude.enumFromBy)(Fay$$_(Fay$$_(Fay$$add)(fr))(by)))(by));
    });
  };
};
Prelude.enumFromThen = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var th = $p2;
      var fr = $p1;
      return Fay$$_(Fay$$_(Prelude.enumFromBy)(fr))(Fay$$_(Fay$$_(Fay$$sub)(th))(fr));
    });
  };
};
Prelude.enumFromByTo = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        var to = $p3;
        var by = $p2;
        var fr = $p1;
        return (function(){
          var neg = function($p1){
            return new Fay$$$(function(){
              var x = $p1;
              return Fay$$_(Fay$$_(Fay$$_(Fay$$lt)(x))(to)) ? null : Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(neg)(Fay$$_(Fay$$_(Fay$$add)(x))(by)));
            });
          };
          var pos = function($p1){
            return new Fay$$$(function(){
              var x = $p1;
              return Fay$$_(Fay$$_(Fay$$_(Fay$$gt)(x))(to)) ? null : Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(pos)(Fay$$_(Fay$$_(Fay$$add)(x))(by)));
            });
          };
          return Fay$$_(Fay$$_(Fay$$_(Fay$$lt)(by))(0)) ? Fay$$_(neg)(fr) : Fay$$_(pos)(fr);
        })();
      });
    };
  };
};
Prelude.enumFromThenTo = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        var to = $p3;
        var th = $p2;
        var fr = $p1;
        return Fay$$_(Fay$$_(Fay$$_(Prelude.enumFromByTo)(fr))(Fay$$_(Fay$$_(Fay$$sub)(th))(fr)))(to);
      });
    };
  };
};
Prelude.fromIntegral = function($p1){
  return new Fay$$$(function(){
    return $p1;
  });
};
Prelude.fromInteger = function($p1){
  return new Fay$$$(function(){
    return $p1;
  });
};
Prelude.not = function($p1){
  return new Fay$$$(function(){
    var p = $p1;
    return Fay$$_(p) ? false : true;
  });
};
Prelude.otherwise = true;
Prelude.show = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_string(JSON.stringify(Fay$$fayToJs(["automatic"],$p1)));
  });
};
Prelude.error = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay(["unknown"],(function() { throw Fay$$fayToJs_string($p1) })());
  });
};
Prelude.$_undefined = new Fay$$$(function(){
  return Fay$$_(Prelude.error)(Fay$$list("Prelude.undefined"));
});
Prelude.either = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        if (Fay$$_($p3) instanceof Prelude._Left) {
          var a = Fay$$_($p3).slot1;
          var f = $p1;
          return Fay$$_(f)(a);
        }
        if (Fay$$_($p3) instanceof Prelude._Right) {
          var b = Fay$$_($p3).slot1;
          var g = $p2;
          return Fay$$_(g)(b);
        }
        throw ["unhandled case in either",[$p1,$p2,$p3]];
      });
    };
  };
};
Prelude.until = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        var x = $p3;
        var f = $p2;
        var p = $p1;
        return Fay$$_(Fay$$_(p)(x)) ? x : Fay$$_(Fay$$_(Fay$$_(Prelude.until)(p))(f))(Fay$$_(f)(x));
      });
    };
  };
};
Prelude.$36$$33$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var x = $p2;
      var f = $p1;
      return Fay$$_(Fay$$_(Fay$$seq)(x))(Fay$$_(f)(x));
    });
  };
};
Prelude.$_const = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var a = $p1;
      return a;
    });
  };
};
Prelude.id = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return x;
  });
};
Prelude.$46$ = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        var x = $p3;
        var g = $p2;
        var f = $p1;
        return Fay$$_(f)(Fay$$_(g)(x));
      });
    };
  };
};
Prelude.$36$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var x = $p2;
      var f = $p1;
      return Fay$$_(f)(x);
    });
  };
};
Prelude.flip = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        var y = $p3;
        var x = $p2;
        var f = $p1;
        return Fay$$_(Fay$$_(f)(y))(x);
      });
    };
  };
};
Prelude.curry = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        var y = $p3;
        var x = $p2;
        var f = $p1;
        return Fay$$_(f)(Fay$$list([x,y]));
      });
    };
  };
};
Prelude.uncurry = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var p = $p2;
      var f = $p1;
      return (function($tmp1){
        if (Fay$$listLen(Fay$$_($tmp1),2)) {
          var x = Fay$$index(0,Fay$$_($tmp1));
          var y = Fay$$index(1,Fay$$_($tmp1));
          return Fay$$_(Fay$$_(f)(x))(y);
        }
        return (function(){ throw (["unhandled case",$tmp1]); })();
      })(p);
    });
  };
};
Prelude.snd = function($p1){
  return new Fay$$$(function(){
    if (Fay$$listLen(Fay$$_($p1),2)) {
      var x = Fay$$index(1,Fay$$_($p1));
      return x;
    }
    throw ["unhandled case in snd",[$p1]];
  });
};
Prelude.fst = function($p1){
  return new Fay$$$(function(){
    if (Fay$$listLen(Fay$$_($p1),2)) {
      var x = Fay$$index(0,Fay$$_($p1));
      return x;
    }
    throw ["unhandled case in fst",[$p1]];
  });
};
Prelude.div = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var y = $p2;
      var x = $p1;
      if (Fay$$_(Fay$$_(Fay$$_(Fay$$and)(Fay$$_(Fay$$_(Fay$$gt)(x))(0)))(Fay$$_(Fay$$_(Fay$$lt)(y))(0)))) {
        return Fay$$_(Fay$$_(Fay$$sub)(Fay$$_(Fay$$_(Prelude.quot)(Fay$$_(Fay$$_(Fay$$sub)(x))(1)))(y)))(1);
      } else {if (Fay$$_(Fay$$_(Fay$$_(Fay$$and)(Fay$$_(Fay$$_(Fay$$lt)(x))(0)))(Fay$$_(Fay$$_(Fay$$gt)(y))(0)))) {
          return Fay$$_(Fay$$_(Fay$$sub)(Fay$$_(Fay$$_(Prelude.quot)(Fay$$_(Fay$$_(Fay$$add)(x))(1)))(y)))(1);
        }
      }
      var y = $p2;
      var x = $p1;
      return Fay$$_(Fay$$_(Prelude.quot)(x))(y);
    });
  };
};
Prelude.mod = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var y = $p2;
      var x = $p1;
      if (Fay$$_(Fay$$_(Fay$$_(Fay$$and)(Fay$$_(Fay$$_(Fay$$gt)(x))(0)))(Fay$$_(Fay$$_(Fay$$lt)(y))(0)))) {
        return Fay$$_(Fay$$_(Fay$$add)(Fay$$_(Fay$$_(Fay$$add)(Fay$$_(Fay$$_(Prelude.rem)(Fay$$_(Fay$$_(Fay$$sub)(x))(1)))(y)))(y)))(1);
      } else {if (Fay$$_(Fay$$_(Fay$$_(Fay$$and)(Fay$$_(Fay$$_(Fay$$lt)(x))(0)))(Fay$$_(Fay$$_(Fay$$gt)(y))(0)))) {
          return Fay$$_(Fay$$_(Fay$$sub)(Fay$$_(Fay$$_(Fay$$add)(Fay$$_(Fay$$_(Prelude.rem)(Fay$$_(Fay$$_(Fay$$add)(x))(1)))(y)))(y)))(1);
        }
      }
      var y = $p2;
      var x = $p1;
      return Fay$$_(Fay$$_(Prelude.rem)(x))(y);
    });
  };
};
Prelude.divMod = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var y = $p2;
      var x = $p1;
      if (Fay$$_(Fay$$_(Fay$$_(Fay$$and)(Fay$$_(Fay$$_(Fay$$gt)(x))(0)))(Fay$$_(Fay$$_(Fay$$lt)(y))(0)))) {
        return (function($tmp1){
          if (Fay$$listLen(Fay$$_($tmp1),2)) {
            var q = Fay$$index(0,Fay$$_($tmp1));
            var r = Fay$$index(1,Fay$$_($tmp1));
            return Fay$$list([Fay$$_(Fay$$_(Fay$$sub)(q))(1),Fay$$_(Fay$$_(Fay$$add)(Fay$$_(Fay$$_(Fay$$add)(r))(y)))(1)]);
          }
          return (function(){ throw (["unhandled case",$tmp1]); })();
        })(Fay$$_(Fay$$_(Prelude.quotRem)(Fay$$_(Fay$$_(Fay$$sub)(x))(1)))(y));
      } else {if (Fay$$_(Fay$$_(Fay$$_(Fay$$and)(Fay$$_(Fay$$_(Fay$$lt)(x))(0)))(Fay$$_(Fay$$_(Fay$$gt)(y))(1)))) {
          return (function($tmp1){
            if (Fay$$listLen(Fay$$_($tmp1),2)) {
              var q = Fay$$index(0,Fay$$_($tmp1));
              var r = Fay$$index(1,Fay$$_($tmp1));
              return Fay$$list([Fay$$_(Fay$$_(Fay$$sub)(q))(1),Fay$$_(Fay$$_(Fay$$sub)(Fay$$_(Fay$$_(Fay$$add)(r))(y)))(1)]);
            }
            return (function(){ throw (["unhandled case",$tmp1]); })();
          })(Fay$$_(Fay$$_(Prelude.quotRem)(Fay$$_(Fay$$_(Fay$$add)(x))(1)))(y));
        }
      }
      var y = $p2;
      var x = $p1;
      return Fay$$_(Fay$$_(Prelude.quotRem)(x))(y);
    });
  };
};
Prelude.min = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay(["unknown"],Math.min(Fay$$_(Fay$$fayToJs(["unknown"],$p1)),Fay$$_(Fay$$fayToJs(["unknown"],$p2))));
    });
  };
};
Prelude.max = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay(["unknown"],Math.max(Fay$$_(Fay$$fayToJs(["unknown"],$p1)),Fay$$_(Fay$$fayToJs(["unknown"],$p2))));
    });
  };
};
Prelude.recip = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Fay$$_(Fay$$divi)(1))(x);
  });
};
Prelude.negate = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return (-(Fay$$_(x)));
  });
};
Prelude.abs = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Fay$$_(Fay$$_(Fay$$lt)(x))(0)) ? Fay$$_(Prelude.negate)(x) : x;
  });
};
Prelude.signum = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Fay$$_(Fay$$_(Fay$$gt)(x))(0)) ? 1 : Fay$$_(Fay$$_(Fay$$_(Fay$$eq)(x))(0)) ? 0 : (-(1));
  });
};
Prelude.pi = new Fay$$$(function(){
  return Fay$$jsToFay_double(Math.PI);
});
Prelude.exp = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_double(Math.exp(Fay$$fayToJs_double($p1)));
  });
};
Prelude.sqrt = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_double(Math.sqrt(Fay$$fayToJs_double($p1)));
  });
};
Prelude.log = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_double(Math.log(Fay$$fayToJs_double($p1)));
  });
};
Prelude.$42$$42$ = new Fay$$$(function(){
  return Prelude.unsafePow;
});
Prelude.$94$$94$ = new Fay$$$(function(){
  return Prelude.unsafePow;
});
Prelude.unsafePow = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay(["unknown"],Math.pow(Fay$$_(Fay$$fayToJs(["unknown"],$p1)),Fay$$_(Fay$$fayToJs(["unknown"],$p2))));
    });
  };
};
Prelude.$94$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var b = $p2;
      var a = $p1;
      if (Fay$$_(Fay$$_(Fay$$_(Fay$$lt)(b))(0))) {
        return Fay$$_(Prelude.error)(Fay$$list("(^): negative exponent"));
      } else {if (Fay$$_(Fay$$_(Fay$$_(Fay$$eq)(b))(0))) {
          return 1;
        } else {if (Fay$$_(Fay$$_(Prelude.even)(b))) {
            return (function(){
              return new Fay$$$(function(){
                var x = new Fay$$$(function(){
                  return Fay$$_(Fay$$_(Prelude.$94$)(a))(Fay$$_(Fay$$_(Prelude.quot)(b))(2));
                });
                return Fay$$_(Fay$$_(Fay$$mult)(x))(x);
              });
            })();
          }
        }
      }
      var b = $p2;
      var a = $p1;
      return Fay$$_(Fay$$_(Fay$$mult)(a))(Fay$$_(Fay$$_(Prelude.$94$)(a))(Fay$$_(Fay$$_(Fay$$sub)(b))(1)));
    });
  };
};
Prelude.logBase = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var x = $p2;
      var b = $p1;
      return Fay$$_(Fay$$_(Fay$$divi)(Fay$$_(Prelude.log)(x)))(Fay$$_(Prelude.log)(b));
    });
  };
};
Prelude.sin = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_double(Math.sin(Fay$$fayToJs_double($p1)));
  });
};
Prelude.tan = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_double(Math.tan(Fay$$fayToJs_double($p1)));
  });
};
Prelude.cos = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_double(Math.cos(Fay$$fayToJs_double($p1)));
  });
};
Prelude.asin = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_double(Math.asin(Fay$$fayToJs_double($p1)));
  });
};
Prelude.atan = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_double(Math.atan(Fay$$fayToJs_double($p1)));
  });
};
Prelude.acos = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_double(Math.acos(Fay$$fayToJs_double($p1)));
  });
};
Prelude.sinh = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Fay$$_(Fay$$divi)(Fay$$_(Fay$$_(Fay$$sub)(Fay$$_(Prelude.exp)(x)))(Fay$$_(Prelude.exp)((-(Fay$$_(x)))))))(2);
  });
};
Prelude.tanh = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return (function(){
      return new Fay$$$(function(){
        var a = new Fay$$$(function(){
          return Fay$$_(Prelude.exp)(x);
        });
        var b = new Fay$$$(function(){
          return Fay$$_(Prelude.exp)((-(Fay$$_(x))));
        });
        return Fay$$_(Fay$$_(Fay$$divi)(Fay$$_(Fay$$_(Fay$$sub)(a))(b)))(Fay$$_(Fay$$_(Fay$$add)(a))(b));
      });
    })();
  });
};
Prelude.cosh = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Fay$$_(Fay$$divi)(Fay$$_(Fay$$_(Fay$$add)(Fay$$_(Prelude.exp)(x)))(Fay$$_(Prelude.exp)((-(Fay$$_(x)))))))(2);
  });
};
Prelude.asinh = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Prelude.log)(Fay$$_(Fay$$_(Fay$$add)(x))(Fay$$_(Prelude.sqrt)(Fay$$_(Fay$$_(Fay$$add)(Fay$$_(Fay$$_(Prelude.$42$$42$)(x))(2)))(1))));
  });
};
Prelude.atanh = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Fay$$_(Fay$$divi)(Fay$$_(Prelude.log)(Fay$$_(Fay$$_(Fay$$divi)(Fay$$_(Fay$$_(Fay$$add)(1))(x)))(Fay$$_(Fay$$_(Fay$$sub)(1))(x)))))(2);
  });
};
Prelude.acosh = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Prelude.log)(Fay$$_(Fay$$_(Fay$$add)(x))(Fay$$_(Prelude.sqrt)(Fay$$_(Fay$$_(Fay$$sub)(Fay$$_(Fay$$_(Prelude.$42$$42$)(x))(2)))(1))));
  });
};
Prelude.properFraction = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return (function(){
      return new Fay$$$(function(){
        var a = new Fay$$$(function(){
          return Fay$$_(Prelude.truncate)(x);
        });
        return Fay$$list([a,Fay$$_(Fay$$_(Fay$$sub)(x))(Fay$$_(Prelude.fromIntegral)(a))]);
      });
    })();
  });
};
Prelude.truncate = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Fay$$_(Fay$$_(Fay$$lt)(x))(0)) ? Fay$$_(Prelude.ceiling)(x) : Fay$$_(Prelude.floor)(x);
  });
};
Prelude.round = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_int(Math.round(Fay$$fayToJs_double($p1)));
  });
};
Prelude.ceiling = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_int(Math.ceil(Fay$$fayToJs_double($p1)));
  });
};
Prelude.floor = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_int(Math.floor(Fay$$fayToJs_double($p1)));
  });
};
Prelude.subtract = new Fay$$$(function(){
  return Fay$$_(Prelude.flip)(Fay$$sub);
});
Prelude.even = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Fay$$_(Fay$$eq)(Fay$$_(Fay$$_(Prelude.rem)(x))(2)))(0);
  });
};
Prelude.odd = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Prelude.not)(Fay$$_(Prelude.even)(x));
  });
};
Prelude.gcd = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var b = $p2;
      var a = $p1;
      return (function(){
        var go = function($p1){
          return function($p2){
            return new Fay$$$(function(){
              if (Fay$$_($p2) === 0) {
                var x = $p1;
                return x;
              }
              var y = $p2;
              var x = $p1;
              return Fay$$_(Fay$$_(go)(y))(Fay$$_(Fay$$_(Prelude.rem)(x))(y));
            });
          };
        };
        return Fay$$_(Fay$$_(go)(Fay$$_(Prelude.abs)(a)))(Fay$$_(Prelude.abs)(b));
      })();
    });
  };
};
Prelude.quot = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var y = $p2;
      var x = $p1;
      return Fay$$_(Fay$$_(Fay$$_(Fay$$eq)(y))(0)) ? Fay$$_(Prelude.error)(Fay$$list("Division by zero")) : Fay$$_(Fay$$_(Prelude.quot$39$)(x))(y);
    });
  };
};
Prelude.quot$39$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay_int(~~(Fay$$fayToJs_int($p1)/Fay$$fayToJs_int($p2)));
    });
  };
};
Prelude.quotRem = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var y = $p2;
      var x = $p1;
      return Fay$$list([Fay$$_(Fay$$_(Prelude.quot)(x))(y),Fay$$_(Fay$$_(Prelude.rem)(x))(y)]);
    });
  };
};
Prelude.rem = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var y = $p2;
      var x = $p1;
      return Fay$$_(Fay$$_(Fay$$_(Fay$$eq)(y))(0)) ? Fay$$_(Prelude.error)(Fay$$list("Division by zero")) : Fay$$_(Fay$$_(Prelude.rem$39$)(x))(y);
    });
  };
};
Prelude.rem$39$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay_int(Fay$$fayToJs_int($p1) % Fay$$fayToJs_int($p2));
    });
  };
};
Prelude.lcm = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === 0) {
        return 0;
      }
      if (Fay$$_($p1) === 0) {
        return 0;
      }
      var b = $p2;
      var a = $p1;
      return Fay$$_(Prelude.abs)(Fay$$_(Fay$$_(Fay$$mult)(Fay$$_(Fay$$_(Prelude.quot)(a))(Fay$$_(Fay$$_(Prelude.gcd)(a))(b))))(b));
    });
  };
};
Prelude.find = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var p = $p1;
        return Fay$$_(Fay$$_(p)(x)) ? Fay$$_(Prelude.Just)(x) : Fay$$_(Fay$$_(Prelude.find)(p))(xs);
      }
      if (Fay$$_($p2) === null) {
        return Prelude.Nothing;
      }
      throw ["unhandled case in find",[$p1,$p2]];
    });
  };
};
Prelude.filter = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var p = $p1;
        return Fay$$_(Fay$$_(p)(x)) ? Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(Fay$$_(Prelude.filter)(p))(xs)) : Fay$$_(Fay$$_(Prelude.filter)(p))(xs);
      }
      if (Fay$$_($p2) === null) {
        return null;
      }
      throw ["unhandled case in filter",[$p1,$p2]];
    });
  };
};
Prelude.$_null = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return true;
    }
    return false;
  });
};
Prelude.map = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === null) {
        return null;
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var f = $p1;
        return Fay$$_(Fay$$_(Fay$$cons)(Fay$$_(f)(x)))(Fay$$_(Fay$$_(Prelude.map)(f))(xs));
      }
      throw ["unhandled case in map",[$p1,$p2]];
    });
  };
};
Prelude.nub = function($p1){
  return new Fay$$$(function(){
    var ls = $p1;
    return Fay$$_(Fay$$_(Prelude.nub$39$)(ls))(null);
  });
};
Prelude.nub$39$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p1) === null) {
        return null;
      }
      var ls = $p2;
      var $tmp1 = Fay$$_($p1);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        return Fay$$_(Fay$$_(Fay$$_(Prelude.elem)(x))(ls)) ? Fay$$_(Fay$$_(Prelude.nub$39$)(xs))(ls) : Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(Fay$$_(Prelude.nub$39$)(xs))(Fay$$_(Fay$$_(Fay$$cons)(x))(ls)));
      }
      throw ["unhandled case in nub'",[$p1,$p2]];
    });
  };
};
Prelude.elem = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var y = $tmp1.car;
        var ys = $tmp1.cdr;
        var x = $p1;
        return Fay$$_(Fay$$_(Fay$$or)(Fay$$_(Fay$$_(Fay$$eq)(x))(y)))(Fay$$_(Fay$$_(Prelude.elem)(x))(ys));
      }
      if (Fay$$_($p2) === null) {
        return false;
      }
      throw ["unhandled case in elem",[$p1,$p2]];
    });
  };
};
Prelude.notElem = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var ys = $p2;
      var x = $p1;
      return Fay$$_(Prelude.not)(Fay$$_(Fay$$_(Prelude.elem)(x))(ys));
    });
  };
};
Prelude.sort = new Fay$$$(function(){
  return Fay$$_(Prelude.sortBy)(Prelude.compare);
});
Prelude.sortBy = function($p1){
  return new Fay$$$(function(){
    var cmp = $p1;
    return Fay$$_(Fay$$_(Prelude.foldr)(Fay$$_(Prelude.insertBy)(cmp)))(null);
  });
};
Prelude.insertBy = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        if (Fay$$_($p3) === null) {
          var x = $p2;
          return Fay$$list([x]);
        }
        var ys = $p3;
        var x = $p2;
        var cmp = $p1;
        return (function($tmp1){
          if (Fay$$_($tmp1) === null) {
            return Fay$$list([x]);
          }
          var $tmp2 = Fay$$_($tmp1);
          if ($tmp2 instanceof Fay$$Cons) {
            var y = $tmp2.car;
            var ys$39$ = $tmp2.cdr;
            return (function($tmp2){
              if (Fay$$_($tmp2) instanceof Prelude._GT) {
                return Fay$$_(Fay$$_(Fay$$cons)(y))(Fay$$_(Fay$$_(Fay$$_(Prelude.insertBy)(cmp))(x))(ys$39$));
              }
              return Fay$$_(Fay$$_(Fay$$cons)(x))(ys);
            })(Fay$$_(Fay$$_(cmp)(x))(y));
          }
          return (function(){ throw (["unhandled case",$tmp1]); })();
        })(ys);
      });
    };
  };
};
Prelude.conc = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var ys = $p2;
      var $tmp1 = Fay$$_($p1);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        return Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(Fay$$_(Prelude.conc)(xs))(ys));
      }
      var ys = $p2;
      if (Fay$$_($p1) === null) {
        return ys;
      }
      throw ["unhandled case in conc",[$p1,$p2]];
    });
  };
};
Prelude.concat = new Fay$$$(function(){
  return Fay$$_(Fay$$_(Prelude.foldr)(Prelude.conc))(null);
});
Prelude.concatMap = function($p1){
  return new Fay$$$(function(){
    var f = $p1;
    return Fay$$_(Fay$$_(Prelude.foldr)(Fay$$_(Fay$$_(Prelude.$46$)(Prelude.$43$$43$))(f)))(null);
  });
};
Prelude.foldr = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        if (Fay$$_($p3) === null) {
          var z = $p2;
          return z;
        }
        var $tmp1 = Fay$$_($p3);
        if ($tmp1 instanceof Fay$$Cons) {
          var x = $tmp1.car;
          var xs = $tmp1.cdr;
          var z = $p2;
          var f = $p1;
          return Fay$$_(Fay$$_(f)(x))(Fay$$_(Fay$$_(Fay$$_(Prelude.foldr)(f))(z))(xs));
        }
        throw ["unhandled case in foldr",[$p1,$p2,$p3]];
      });
    };
  };
};
Prelude.foldr1 = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$listLen(Fay$$_($p2),1)) {
        var x = Fay$$index(0,Fay$$_($p2));
        return x;
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var f = $p1;
        return Fay$$_(Fay$$_(f)(x))(Fay$$_(Fay$$_(Prelude.foldr1)(f))(xs));
      }
      if (Fay$$_($p2) === null) {
        return Fay$$_(Prelude.error)(Fay$$list("foldr1: empty list"));
      }
      throw ["unhandled case in foldr1",[$p1,$p2]];
    });
  };
};
Prelude.foldl = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        if (Fay$$_($p3) === null) {
          var z = $p2;
          return z;
        }
        var $tmp1 = Fay$$_($p3);
        if ($tmp1 instanceof Fay$$Cons) {
          var x = $tmp1.car;
          var xs = $tmp1.cdr;
          var z = $p2;
          var f = $p1;
          return Fay$$_(Fay$$_(Fay$$_(Prelude.foldl)(f))(Fay$$_(Fay$$_(f)(z))(x)))(xs);
        }
        throw ["unhandled case in foldl",[$p1,$p2,$p3]];
      });
    };
  };
};
Prelude.foldl1 = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var f = $p1;
        return Fay$$_(Fay$$_(Fay$$_(Prelude.foldl)(f))(x))(xs);
      }
      if (Fay$$_($p2) === null) {
        return Fay$$_(Prelude.error)(Fay$$list("foldl1: empty list"));
      }
      throw ["unhandled case in foldl1",[$p1,$p2]];
    });
  };
};
Prelude.$43$$43$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var y = $p2;
      var x = $p1;
      return Fay$$_(Fay$$_(Prelude.conc)(x))(y);
    });
  };
};
Prelude.$33$$33$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var b = $p2;
      var a = $p1;
      return (function(){
        var go = function($p1){
          return function($p2){
            return new Fay$$$(function(){
              if (Fay$$_($p1) === null) {
                return Fay$$_(Prelude.error)(Fay$$list("(!!): index too large"));
              }
              if (Fay$$_($p2) === 0) {
                var $tmp1 = Fay$$_($p1);
                if ($tmp1 instanceof Fay$$Cons) {
                  var h = $tmp1.car;
                  return h;
                }
              }
              var n = $p2;
              var $tmp1 = Fay$$_($p1);
              if ($tmp1 instanceof Fay$$Cons) {
                var t = $tmp1.cdr;
                return Fay$$_(Fay$$_(go)(t))(Fay$$_(Fay$$_(Fay$$sub)(n))(1));
              }
              throw ["unhandled case in go",[$p1,$p2]];
            });
          };
        };
        return Fay$$_(Fay$$_(Fay$$_(Fay$$lt)(b))(0)) ? Fay$$_(Prelude.error)(Fay$$list("(!!): negative index")) : Fay$$_(Fay$$_(go)(a))(b);
      })();
    });
  };
};
Prelude.head = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return Fay$$_(Prelude.error)(Fay$$list("head: empty list"));
    }
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      var h = $tmp1.car;
      return h;
    }
    throw ["unhandled case in head",[$p1]];
  });
};
Prelude.tail = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return Fay$$_(Prelude.error)(Fay$$list("tail: empty list"));
    }
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      var t = $tmp1.cdr;
      return t;
    }
    throw ["unhandled case in tail",[$p1]];
  });
};
Prelude.init = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return Fay$$_(Prelude.error)(Fay$$list("init: empty list"));
    }
    if (Fay$$listLen(Fay$$_($p1),1)) {
      var a = Fay$$index(0,Fay$$_($p1));
      return null;
    }
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      var h = $tmp1.car;
      var t = $tmp1.cdr;
      return Fay$$_(Fay$$_(Fay$$cons)(h))(Fay$$_(Prelude.init)(t));
    }
    throw ["unhandled case in init",[$p1]];
  });
};
Prelude.last = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return Fay$$_(Prelude.error)(Fay$$list("last: empty list"));
    }
    if (Fay$$listLen(Fay$$_($p1),1)) {
      var a = Fay$$index(0,Fay$$_($p1));
      return a;
    }
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      var t = $tmp1.cdr;
      return Fay$$_(Prelude.last)(t);
    }
    throw ["unhandled case in last",[$p1]];
  });
};
Prelude.iterate = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var x = $p2;
      var f = $p1;
      return Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(Fay$$_(Prelude.iterate)(f))(Fay$$_(f)(x)));
    });
  };
};
Prelude.repeat = function($p1){
  return new Fay$$$(function(){
    var x = $p1;
    return Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(Prelude.repeat)(x));
  });
};
Prelude.replicate = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p1) === 0) {
        return null;
      }
      var x = $p2;
      var n = $p1;
      return Fay$$_(Fay$$_(Fay$$_(Fay$$lt)(n))(0)) ? null : Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(Fay$$_(Prelude.replicate)(Fay$$_(Fay$$_(Fay$$sub)(n))(1)))(x));
    });
  };
};
Prelude.cycle = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return Fay$$_(Prelude.error)(Fay$$list("cycle: empty list"));
    }
    var xs = $p1;
    return (function(){
      var xs$39$ = new Fay$$$(function(){
        return Fay$$_(Fay$$_(Prelude.$43$$43$)(xs))(xs$39$);
      });
      return xs$39$;
    })();
  });
};
Prelude.take = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p1) === 0) {
        return null;
      }
      if (Fay$$_($p2) === null) {
        return null;
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var n = $p1;
        return Fay$$_(Fay$$_(Fay$$_(Fay$$lt)(n))(0)) ? null : Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(Fay$$_(Prelude.take)(Fay$$_(Fay$$_(Fay$$sub)(n))(1)))(xs));
      }
      throw ["unhandled case in take",[$p1,$p2]];
    });
  };
};
Prelude.drop = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var xs = $p2;
      if (Fay$$_($p1) === 0) {
        return xs;
      }
      if (Fay$$_($p2) === null) {
        return null;
      }
      var xss = $p2;
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var n = $p1;
        return Fay$$_(Fay$$_(Fay$$_(Fay$$lt)(n))(0)) ? xss : Fay$$_(Fay$$_(Prelude.drop)(Fay$$_(Fay$$_(Fay$$sub)(n))(1)))(xs);
      }
      throw ["unhandled case in drop",[$p1,$p2]];
    });
  };
};
Prelude.splitAt = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var xs = $p2;
      if (Fay$$_($p1) === 0) {
        return Fay$$list([null,xs]);
      }
      if (Fay$$_($p2) === null) {
        return Fay$$list([null,null]);
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var n = $p1;
        return Fay$$_(Fay$$_(Fay$$_(Fay$$lt)(n))(0)) ? Fay$$list([null,Fay$$_(Fay$$_(Fay$$cons)(x))(xs)]) : (function($tmp1){
          if (Fay$$listLen(Fay$$_($tmp1),2)) {
            var a = Fay$$index(0,Fay$$_($tmp1));
            var b = Fay$$index(1,Fay$$_($tmp1));
            return Fay$$list([Fay$$_(Fay$$_(Fay$$cons)(x))(a),b]);
          }
          return (function(){ throw (["unhandled case",$tmp1]); })();
        })(Fay$$_(Fay$$_(Prelude.splitAt)(Fay$$_(Fay$$_(Fay$$sub)(n))(1)))(xs));
      }
      throw ["unhandled case in splitAt",[$p1,$p2]];
    });
  };
};
Prelude.takeWhile = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === null) {
        return null;
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var p = $p1;
        return Fay$$_(Fay$$_(p)(x)) ? Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(Fay$$_(Prelude.takeWhile)(p))(xs)) : null;
      }
      throw ["unhandled case in takeWhile",[$p1,$p2]];
    });
  };
};
Prelude.dropWhile = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === null) {
        return null;
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var p = $p1;
        return Fay$$_(Fay$$_(p)(x)) ? Fay$$_(Fay$$_(Prelude.dropWhile)(p))(xs) : Fay$$_(Fay$$_(Fay$$cons)(x))(xs);
      }
      throw ["unhandled case in dropWhile",[$p1,$p2]];
    });
  };
};
Prelude.span = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === null) {
        return Fay$$list([null,null]);
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var p = $p1;
        return Fay$$_(Fay$$_(p)(x)) ? (function($tmp1){
          if (Fay$$listLen(Fay$$_($tmp1),2)) {
            var a = Fay$$index(0,Fay$$_($tmp1));
            var b = Fay$$index(1,Fay$$_($tmp1));
            return Fay$$list([Fay$$_(Fay$$_(Fay$$cons)(x))(a),b]);
          }
          return (function(){ throw (["unhandled case",$tmp1]); })();
        })(Fay$$_(Fay$$_(Prelude.span)(p))(xs)) : Fay$$list([null,Fay$$_(Fay$$_(Fay$$cons)(x))(xs)]);
      }
      throw ["unhandled case in span",[$p1,$p2]];
    });
  };
};
Prelude.$_break = function($p1){
  return new Fay$$$(function(){
    var p = $p1;
    return Fay$$_(Prelude.span)(Fay$$_(Fay$$_(Prelude.$46$)(Prelude.not))(p));
  });
};
Prelude.zipWith = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        var $tmp1 = Fay$$_($p3);
        if ($tmp1 instanceof Fay$$Cons) {
          var b = $tmp1.car;
          var bs = $tmp1.cdr;
          var $tmp1 = Fay$$_($p2);
          if ($tmp1 instanceof Fay$$Cons) {
            var a = $tmp1.car;
            var as = $tmp1.cdr;
            var f = $p1;
            return Fay$$_(Fay$$_(Fay$$cons)(Fay$$_(Fay$$_(f)(a))(b)))(Fay$$_(Fay$$_(Fay$$_(Prelude.zipWith)(f))(as))(bs));
          }
        }
        return null;
      });
    };
  };
};
Prelude.zipWith3 = function($p1){
  return function($p2){
    return function($p3){
      return function($p4){
        return new Fay$$$(function(){
          var $tmp1 = Fay$$_($p4);
          if ($tmp1 instanceof Fay$$Cons) {
            var c = $tmp1.car;
            var cs = $tmp1.cdr;
            var $tmp1 = Fay$$_($p3);
            if ($tmp1 instanceof Fay$$Cons) {
              var b = $tmp1.car;
              var bs = $tmp1.cdr;
              var $tmp1 = Fay$$_($p2);
              if ($tmp1 instanceof Fay$$Cons) {
                var a = $tmp1.car;
                var as = $tmp1.cdr;
                var f = $p1;
                return Fay$$_(Fay$$_(Fay$$cons)(Fay$$_(Fay$$_(Fay$$_(f)(a))(b))(c)))(Fay$$_(Fay$$_(Fay$$_(Fay$$_(Prelude.zipWith3)(f))(as))(bs))(cs));
              }
            }
          }
          return null;
        });
      };
    };
  };
};
Prelude.zip = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var b = $tmp1.car;
        var bs = $tmp1.cdr;
        var $tmp1 = Fay$$_($p1);
        if ($tmp1 instanceof Fay$$Cons) {
          var a = $tmp1.car;
          var as = $tmp1.cdr;
          return Fay$$_(Fay$$_(Fay$$cons)(Fay$$list([a,b])))(Fay$$_(Fay$$_(Prelude.zip)(as))(bs));
        }
      }
      return null;
    });
  };
};
Prelude.zip3 = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        var $tmp1 = Fay$$_($p3);
        if ($tmp1 instanceof Fay$$Cons) {
          var c = $tmp1.car;
          var cs = $tmp1.cdr;
          var $tmp1 = Fay$$_($p2);
          if ($tmp1 instanceof Fay$$Cons) {
            var b = $tmp1.car;
            var bs = $tmp1.cdr;
            var $tmp1 = Fay$$_($p1);
            if ($tmp1 instanceof Fay$$Cons) {
              var a = $tmp1.car;
              var as = $tmp1.cdr;
              return Fay$$_(Fay$$_(Fay$$cons)(Fay$$list([a,b,c])))(Fay$$_(Fay$$_(Fay$$_(Prelude.zip3)(as))(bs))(cs));
            }
          }
        }
        return null;
      });
    };
  };
};
Prelude.unzip = function($p1){
  return new Fay$$$(function(){
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      if (Fay$$listLen(Fay$$_($tmp1.car),2)) {
        var x = Fay$$index(0,Fay$$_($tmp1.car));
        var y = Fay$$index(1,Fay$$_($tmp1.car));
        var ps = $tmp1.cdr;
        return (function($tmp1){
          if (Fay$$listLen(Fay$$_($tmp1),2)) {
            var xs = Fay$$index(0,Fay$$_($tmp1));
            var ys = Fay$$index(1,Fay$$_($tmp1));
            return Fay$$list([Fay$$_(Fay$$_(Fay$$cons)(x))(xs),Fay$$_(Fay$$_(Fay$$cons)(y))(ys)]);
          }
          return (function(){ throw (["unhandled case",$tmp1]); })();
        })(Fay$$_(Prelude.unzip)(ps));
      }
    }
    if (Fay$$_($p1) === null) {
      return Fay$$list([null,null]);
    }
    throw ["unhandled case in unzip",[$p1]];
  });
};
Prelude.unzip3 = function($p1){
  return new Fay$$$(function(){
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      if (Fay$$listLen(Fay$$_($tmp1.car),3)) {
        var x = Fay$$index(0,Fay$$_($tmp1.car));
        var y = Fay$$index(1,Fay$$_($tmp1.car));
        var z = Fay$$index(2,Fay$$_($tmp1.car));
        var ps = $tmp1.cdr;
        return (function($tmp1){
          if (Fay$$listLen(Fay$$_($tmp1),3)) {
            var xs = Fay$$index(0,Fay$$_($tmp1));
            var ys = Fay$$index(1,Fay$$_($tmp1));
            var zs = Fay$$index(2,Fay$$_($tmp1));
            return Fay$$list([Fay$$_(Fay$$_(Fay$$cons)(x))(xs),Fay$$_(Fay$$_(Fay$$cons)(y))(ys),Fay$$_(Fay$$_(Fay$$cons)(z))(zs)]);
          }
          return (function(){ throw (["unhandled case",$tmp1]); })();
        })(Fay$$_(Prelude.unzip3)(ps));
      }
    }
    if (Fay$$_($p1) === null) {
      return Fay$$list([null,null,null]);
    }
    throw ["unhandled case in unzip3",[$p1]];
  });
};
Prelude.lines = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return null;
    }
    var s = $p1;
    return (function(){
      var isLineBreak = function($p1){
        return new Fay$$$(function(){
          var c = $p1;
          return Fay$$_(Fay$$_(Fay$$or)(Fay$$_(Fay$$_(Fay$$eq)(c))("\r")))(Fay$$_(Fay$$_(Fay$$eq)(c))("\n"));
        });
      };
      return (function($tmp1){
        if (Fay$$listLen(Fay$$_($tmp1),2)) {
          var a = Fay$$index(0,Fay$$_($tmp1));
          if (Fay$$_(Fay$$index(1,Fay$$_($tmp1))) === null) {
            return Fay$$list([a]);
          }
          var a = Fay$$index(0,Fay$$_($tmp1));
          var $tmp2 = Fay$$_(Fay$$index(1,Fay$$_($tmp1)));
          if ($tmp2 instanceof Fay$$Cons) {
            var cs = $tmp2.cdr;
            return Fay$$_(Fay$$_(Fay$$cons)(a))(Fay$$_(Prelude.lines)(cs));
          }
        }
        return (function(){ throw (["unhandled case",$tmp1]); })();
      })(Fay$$_(Fay$$_(Prelude.$_break)(isLineBreak))(s));
    })();
  });
};
Prelude.unlines = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return null;
    }
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      var l = $tmp1.car;
      var ls = $tmp1.cdr;
      return Fay$$_(Fay$$_(Prelude.$43$$43$)(l))(Fay$$_(Fay$$_(Fay$$cons)("\n"))(Fay$$_(Prelude.unlines)(ls)));
    }
    throw ["unhandled case in unlines",[$p1]];
  });
};
Prelude.words = function($p1){
  return new Fay$$$(function(){
    var str = $p1;
    return (function(){
      var words$39$ = function($p1){
        return new Fay$$$(function(){
          if (Fay$$_($p1) === null) {
            return null;
          }
          var s = $p1;
          return (function($tmp1){
            if (Fay$$listLen(Fay$$_($tmp1),2)) {
              var a = Fay$$index(0,Fay$$_($tmp1));
              var b = Fay$$index(1,Fay$$_($tmp1));
              return Fay$$_(Fay$$_(Fay$$cons)(a))(Fay$$_(Prelude.words)(b));
            }
            return (function(){ throw (["unhandled case",$tmp1]); })();
          })(Fay$$_(Fay$$_(Prelude.$_break)(isSpace))(s));
        });
      };
      var isSpace = function($p1){
        return new Fay$$$(function(){
          var c = $p1;
          return Fay$$_(Fay$$_(Prelude.elem)(c))(Fay$$list(" \t\r\n\u000c\u000b"));
        });
      };
      return Fay$$_(words$39$)(Fay$$_(Fay$$_(Prelude.dropWhile)(isSpace))(str));
    })();
  });
};
Prelude.unwords = new Fay$$$(function(){
  return Fay$$_(Prelude.intercalate)(Fay$$list(" "));
});
Prelude.and = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return true;
    }
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      var x = $tmp1.car;
      var xs = $tmp1.cdr;
      return Fay$$_(Fay$$_(Fay$$and)(x))(Fay$$_(Prelude.and)(xs));
    }
    throw ["unhandled case in and",[$p1]];
  });
};
Prelude.or = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return false;
    }
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      var x = $tmp1.car;
      var xs = $tmp1.cdr;
      return Fay$$_(Fay$$_(Fay$$or)(x))(Fay$$_(Prelude.or)(xs));
    }
    throw ["unhandled case in or",[$p1]];
  });
};
Prelude.any = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === null) {
        return false;
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var p = $p1;
        return Fay$$_(Fay$$_(Fay$$or)(Fay$$_(p)(x)))(Fay$$_(Fay$$_(Prelude.any)(p))(xs));
      }
      throw ["unhandled case in any",[$p1,$p2]];
    });
  };
};
Prelude.all = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === null) {
        return true;
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var p = $p1;
        return Fay$$_(Fay$$_(Fay$$and)(Fay$$_(p)(x)))(Fay$$_(Fay$$_(Prelude.all)(p))(xs));
      }
      throw ["unhandled case in all",[$p1,$p2]];
    });
  };
};
Prelude.intersperse = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === null) {
        return null;
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var sep = $p1;
        return Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(Fay$$_(Prelude.prependToAll)(sep))(xs));
      }
      throw ["unhandled case in intersperse",[$p1,$p2]];
    });
  };
};
Prelude.prependToAll = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === null) {
        return null;
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var sep = $p1;
        return Fay$$_(Fay$$_(Fay$$cons)(sep))(Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(Fay$$_(Prelude.prependToAll)(sep))(xs)));
      }
      throw ["unhandled case in prependToAll",[$p1,$p2]];
    });
  };
};
Prelude.intercalate = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var xss = $p2;
      var xs = $p1;
      return Fay$$_(Prelude.concat)(Fay$$_(Fay$$_(Prelude.intersperse)(xs))(xss));
    });
  };
};
Prelude.maximum = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return Fay$$_(Prelude.error)(Fay$$list("maximum: empty list"));
    }
    var xs = $p1;
    return Fay$$_(Fay$$_(Prelude.foldl1)(Prelude.max))(xs);
  });
};
Prelude.minimum = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return Fay$$_(Prelude.error)(Fay$$list("minimum: empty list"));
    }
    var xs = $p1;
    return Fay$$_(Fay$$_(Prelude.foldl1)(Prelude.min))(xs);
  });
};
Prelude.product = function($p1){
  return new Fay$$$(function(){
    var xs = $p1;
    return Fay$$_(Fay$$_(Fay$$_(Prelude.foldl)(Fay$$mult))(1))(xs);
  });
};
Prelude.sum = function($p1){
  return new Fay$$$(function(){
    var xs = $p1;
    return Fay$$_(Fay$$_(Fay$$_(Prelude.foldl)(Fay$$add))(0))(xs);
  });
};
Prelude.scanl = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        var l = $p3;
        var z = $p2;
        var f = $p1;
        return Fay$$_(Fay$$_(Fay$$cons)(z))((function($tmp1){
          if (Fay$$_($tmp1) === null) {
            return null;
          }
          var $tmp2 = Fay$$_($tmp1);
          if ($tmp2 instanceof Fay$$Cons) {
            var x = $tmp2.car;
            var xs = $tmp2.cdr;
            return Fay$$_(Fay$$_(Fay$$_(Prelude.scanl)(f))(Fay$$_(Fay$$_(f)(z))(x)))(xs);
          }
          return (function(){ throw (["unhandled case",$tmp1]); })();
        })(l));
      });
    };
  };
};
Prelude.scanl1 = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === null) {
        return null;
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var f = $p1;
        return Fay$$_(Fay$$_(Fay$$_(Prelude.scanl)(f))(x))(xs);
      }
      throw ["unhandled case in scanl1",[$p1,$p2]];
    });
  };
};
Prelude.scanr = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        if (Fay$$_($p3) === null) {
          var z = $p2;
          return Fay$$list([z]);
        }
        var $tmp1 = Fay$$_($p3);
        if ($tmp1 instanceof Fay$$Cons) {
          var x = $tmp1.car;
          var xs = $tmp1.cdr;
          var z = $p2;
          var f = $p1;
          return (function($tmp1){
            var $tmp2 = Fay$$_($tmp1);
            if ($tmp2 instanceof Fay$$Cons) {
              var h = $tmp2.car;
              var t = $tmp2.cdr;
              return Fay$$_(Fay$$_(Fay$$cons)(Fay$$_(Fay$$_(f)(x))(h)))(Fay$$_(Fay$$_(Fay$$cons)(h))(t));
            }
            return Prelude.$_undefined;
          })(Fay$$_(Fay$$_(Fay$$_(Prelude.scanr)(f))(z))(xs));
        }
        throw ["unhandled case in scanr",[$p1,$p2,$p3]];
      });
    };
  };
};
Prelude.scanr1 = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === null) {
        return null;
      }
      if (Fay$$listLen(Fay$$_($p2),1)) {
        var x = Fay$$index(0,Fay$$_($p2));
        return Fay$$list([x]);
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var f = $p1;
        return (function($tmp1){
          var $tmp2 = Fay$$_($tmp1);
          if ($tmp2 instanceof Fay$$Cons) {
            var h = $tmp2.car;
            var t = $tmp2.cdr;
            return Fay$$_(Fay$$_(Fay$$cons)(Fay$$_(Fay$$_(f)(x))(h)))(Fay$$_(Fay$$_(Fay$$cons)(h))(t));
          }
          return Prelude.$_undefined;
        })(Fay$$_(Fay$$_(Prelude.scanr1)(f))(xs));
      }
      throw ["unhandled case in scanr1",[$p1,$p2]];
    });
  };
};
Prelude.lookup = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === null) {
        var _key = $p1;
        return Prelude.Nothing;
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        if (Fay$$listLen(Fay$$_($tmp1.car),2)) {
          var x = Fay$$index(0,Fay$$_($tmp1.car));
          var y = Fay$$index(1,Fay$$_($tmp1.car));
          var xys = $tmp1.cdr;
          var key = $p1;
          return Fay$$_(Fay$$_(Fay$$_(Fay$$eq)(key))(x)) ? Fay$$_(Prelude.Just)(y) : Fay$$_(Fay$$_(Prelude.lookup)(key))(xys);
        }
      }
      throw ["unhandled case in lookup",[$p1,$p2]];
    });
  };
};
Prelude.length = function($p1){
  return new Fay$$$(function(){
    var xs = $p1;
    return Fay$$_(Fay$$_(Prelude.length$39$)(0))(xs);
  });
};
Prelude.length$39$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var xs = $tmp1.cdr;
        var acc = $p1;
        return Fay$$_(Fay$$_(Prelude.length$39$)(Fay$$_(Fay$$_(Fay$$add)(acc))(1)))(xs);
      }
      var acc = $p1;
      return acc;
    });
  };
};
Prelude.reverse = function($p1){
  return new Fay$$$(function(){
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      var x = $tmp1.car;
      var xs = $tmp1.cdr;
      return Fay$$_(Fay$$_(Prelude.$43$$43$)(Fay$$_(Prelude.reverse)(xs)))(Fay$$list([x]));
    }
    if (Fay$$_($p1) === null) {
      return null;
    }
    throw ["unhandled case in reverse",[$p1]];
  });
};
Prelude.print = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["unknown"],(function(x) { if (console && console.log) console.log(x) })(Fay$$fayToJs(["automatic"],$p1))));
  });
};
Prelude.putStrLn = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["unknown"],(function(x) { if (console && console.log) console.log(x) })(Fay$$fayToJs_string($p1))));
  });
};
Prelude.ifThenElse = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        var b = $p3;
        var a = $p2;
        var p = $p1;
        return Fay$$_(p) ? a : b;
      });
    };
  };
};
Fay$$objConcat(Fay$$fayToJsHash,{"Just": function(type,argTypes,_obj){
  var obj_ = {"instance": "Just"};
  var obj_slot1 = Fay$$fayToJs(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],_obj.slot1);
  if (undefined !== obj_slot1) {
    obj_['slot1'] = obj_slot1;
  }
  return obj_;
},"Nothing": function(type,argTypes,_obj){
  var obj_ = {"instance": "Nothing"};
  return obj_;
},"Left": function(type,argTypes,_obj){
  var obj_ = {"instance": "Left"};
  var obj_slot1 = Fay$$fayToJs(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],_obj.slot1);
  if (undefined !== obj_slot1) {
    obj_['slot1'] = obj_slot1;
  }
  return obj_;
},"Right": function(type,argTypes,_obj){
  var obj_ = {"instance": "Right"};
  var obj_slot1 = Fay$$fayToJs(argTypes && (argTypes)[1] ? (argTypes)[1] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],_obj.slot1);
  if (undefined !== obj_slot1) {
    obj_['slot1'] = obj_slot1;
  }
  return obj_;
},"GT": function(type,argTypes,_obj){
  var obj_ = {"instance": "GT"};
  return obj_;
},"LT": function(type,argTypes,_obj){
  var obj_ = {"instance": "LT"};
  return obj_;
},"EQ": function(type,argTypes,_obj){
  var obj_ = {"instance": "EQ"};
  return obj_;
}});
Fay$$objConcat(Fay$$jsToFayHash,{"Just": function(type,argTypes,obj){
  return new Prelude._Just(Fay$$jsToFay(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],obj["slot1"]));
},"Nothing": function(type,argTypes,obj){
  return new Prelude._Nothing();
},"Left": function(type,argTypes,obj){
  return new Prelude._Left(Fay$$jsToFay(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],obj["slot1"]));
},"Right": function(type,argTypes,obj){
  return new Prelude._Right(Fay$$jsToFay(argTypes && (argTypes)[1] ? (argTypes)[1] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],obj["slot1"]));
},"GT": function(type,argTypes,obj){
  return new Prelude._GT();
},"LT": function(type,argTypes,obj){
  return new Prelude._LT();
},"EQ": function(type,argTypes,obj){
  return new Prelude._EQ();
}});
var FFI = {};
Fay.Text = {};
Fay.Text.Type = {};
Fay.Text.Type._Text = function Text(){
};
Fay.Text.Type.Text = new Fay$$$(function(){
  return new Fay.Text.Type._Text();
});
Fay.Text.Type.pack = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay(["user","Text",[]],Fay$$fayToJs_string($p1));
  });
};
Fay.Text.Type.unpack = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_string(Fay$$fayToJs(["user","Text",[]],$p1));
  });
};
Fay.Text.Type.fromString = new Fay$$$(function(){
  return Fay.Text.Type.pack;
});
Fay$$objConcat(Fay$$fayToJsHash,{"Text": function(type,argTypes,_obj){
  var obj_ = {"instance": "Text"};
  return obj_;
}});
Fay$$objConcat(Fay$$jsToFayHash,{"Text": function(type,argTypes,obj){
  return new Fay.Text.Type._Text();
}});
Fay.Text.empty = new Fay$$$(function(){
  return Fay$$jsToFay(["user","Text",[]],'');
});
Fay.Text.cons = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay(["user","Text",[]],Fay$$fayToJs(["user","Char",[]],$p1) + Fay$$fayToJs(["user","Text",[]],$p2));
    });
  };
};
Fay.Text.snoc = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay(["user","Text",[]],Fay$$fayToJs(["user","Text",[]],$p1) + Fay$$fayToJs(["user","Char",[]],$p2));
    });
  };
};
Fay.Text.append = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay(["user","Text",[]],Fay$$fayToJs(["user","Text",[]],$p1) + Fay$$fayToJs(["user","Text",[]],$p2));
    });
  };
};
Fay.Text.uncons = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay(["user","Maybe",[["tuple",[["user","Char",[]],["user","Text",[]]]]]],Fay$$fayToJs(["user","Text",[]],$p1)[0] ? { instance: 'Just', slot1 : [Fay$$fayToJs(["user","Text",[]],$p1)[0],Fay$$fayToJs(["user","Text",[]],$p1).slice(1)] } : { instance : 'Nothing' });
  });
};
Fay.Text.head = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay(["user","Char",[]],Fay$$fayToJs(["user","Text",[]],$p1)[0] || (function () {throw new Error('Fay.Text.head: empty Text'); }()));
  });
};
Fay.Text.last = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay(["user","Char",[]],Fay$$fayToJs(["user","Text",[]],$p1).length ? Fay$$fayToJs(["user","Text",[]],$p1)[Fay$$fayToJs(["user","Text",[]],$p1).length-1] : (function() { throw new Error('Fay.Text.last: empty Text') })());
  });
};
Fay.Text.tail = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay(["user","Text",[]],Fay$$fayToJs(["user","Text",[]],$p1).length ? Fay$$fayToJs(["user","Text",[]],$p1).slice(1) : (function () { throw new Error('Fay.Text.tail: empty Text') })());
  });
};
Fay.Text.init = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay(["user","Text",[]],Fay$$fayToJs(["user","Text",[]],$p1).length ? Fay$$fayToJs(["user","Text",[]],$p1).slice(0,-1) : (function () { throw new Error('Fay.Text.init: empty Text') })());
  });
};
Fay.Text.$_null = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_bool(!(Fay$$fayToJs(["user","Text",[]],$p1).length));
  });
};
Fay.Text.length = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay_int(Fay$$fayToJs(["user","Text",[]],$p1).length);
  });
};
Fay.Text.map = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay(["user","Text",[]],[].map.call(Fay$$fayToJs(["user","Text",[]],$p2), Fay$$fayToJs(["function",[["user","Char",[]],["user","Char",[]]]],$p1)).join(''));
    });
  };
};
Fay.Text.intercalate = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay(["user","Text",[]],Fay$$fayToJs(["list",[["user","Text",[]]]],$p2).join(Fay$$fayToJs(["user","Text",[]],$p1)));
    });
  };
};
Fay.Text.intersperse = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay(["user","Text",[]],Fay$$fayToJs(["user","Text",[]],$p2).split('').join(Fay$$fayToJs(["user","Char",[]],$p1)));
    });
  };
};
Fay.Text.reverse = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay(["user","Text",[]],Fay$$fayToJs(["user","Text",[]],$p1).split('').reverse().join(''));
  });
};
Fay.Text.toLower = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay(["user","Text",[]],Fay$$fayToJs(["user","Text",[]],$p1).toLowerCase());
  });
};
Fay.Text.toUpper = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay(["user","Text",[]],Fay$$fayToJs(["user","Text",[]],$p1).toUpperCase());
  });
};
Fay.Text.concat = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay(["user","Text",[]],Fay$$fayToJs(["list",[["user","Text",[]]]],$p1).join(''));
  });
};
Fay.Text.concatMap = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay(["user","Text",[]],[].map.call(Fay$$fayToJs(["user","Text",[]],$p2), Fay$$fayToJs(["function",[["user","Char",[]],["user","Text",[]]]],$p1)).join(''));
    });
  };
};
Fay.Text.any = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay_bool([].filter.call(Fay$$fayToJs(["user","Text",[]],$p2), Fay$$fayToJs(["function",[["user","Char",[]],["bool"]]],$p1)).length > 0);
    });
  };
};
Fay.Text.all = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay_bool([].filter.call(Fay$$fayToJs(["user","Text",[]],$p2), Fay$$fayToJs(["function",[["user","Char",[]],["bool"]]],$p1)).length == Fay$$fayToJs(["function",[["user","Char",[]],["bool"]]],$p1).length);
    });
  };
};
Fay.Text.maximum = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay(["user","Char",[]],(function (s) {    if (s === '') { throw new Error('Fay.Text.maximum: empty string'); }    var max = s[0];    for (var i = 1; i < s.length; s++) {      if (s[i] > max) { max = s[i]; }    }    return max;  })(Fay$$fayToJs(["user","Text",[]],$p1)));
  });
};
Fay.Text.minimum = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay(["user","Char",[]],(function (s) {    if (s === '') { throw new Error('Fay.Text.maximum: empty string'); }    var min = s[0];    for (var i = 1; i < s.length; s++) {      if (s[i] < min) { min = s[i]; }    }    return min;  })(Fay$$fayToJs(["user","Text",[]],$p1)));
  });
};
Fay.Text.fromString = Fay.Text.Type.fromString;
Fay.Text.pack = Fay.Text.Type.pack;
Fay.Text.unpack = Fay.Text.Type.unpack;
var JQuery = {};
JQuery.emptyCallback = new Fay$$$(function(){
  return Fay$$_(Fay$$_(Prelude.$36$)(Prelude.$_const))(Fay$$_(Fay$$$_return)(Fay$$unit));
});
JQuery.ajax = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        var err = $p3;
        var succ = $p2;
        var ur = $p1;
        return Fay$$_(Fay$$_(Prelude.$36$)(JQuery.ajax$39$))((function(){
          var $36$_record_to_update = Object.create(Fay$$_(JQuery.defaultAjaxSettings));
          $36$_record_to_update.success = Fay$$_(Fay.FFI.Defined)(succ);
          $36$_record_to_update.data$39$ = Fay.FFI.Undefined;
          $36$_record_to_update.error$39$ = Fay$$_(Fay.FFI.Defined)(err);
          $36$_record_to_update.url = Fay$$_(Fay.FFI.Defined)(ur);
          return $36$_record_to_update;
        })());
      });
    };
  };
};
JQuery.ajaxPost = function($p1){
  return function($p2){
    return function($p3){
      return function($p4){
        return new Fay$$$(function(){
          var err = $p4;
          var succ = $p3;
          var dat = $p2;
          var ur = $p1;
          return Fay$$_(Fay$$_(Prelude.$36$)(JQuery.ajax$39$))((function(){
            var $36$_record_to_update = Object.create(Fay$$_(JQuery.defaultAjaxSettings));
            $36$_record_to_update.success = Fay$$_(Fay.FFI.Defined)(succ);
            $36$_record_to_update.data$39$ = Fay$$_(Fay.FFI.Defined)(dat);
            $36$_record_to_update.error$39$ = Fay$$_(Fay.FFI.Defined)(err);
            $36$_record_to_update.url = Fay$$_(Fay.FFI.Defined)(ur);
            $36$_record_to_update.type$39$ = Fay$$_(Fay.FFI.Defined)("POST");
            $36$_record_to_update.processData = Fay$$_(Fay.FFI.Defined)(false);
            $36$_record_to_update.contentType = Fay$$_(Fay.FFI.Defined)("text/json");
            $36$_record_to_update.dataType = Fay$$_(Fay.FFI.Defined)("json");
            return $36$_record_to_update;
          })());
        });
      };
    };
  };
};
JQuery.ajaxPostParam = function($p1){
  return function($p2){
    return function($p3){
      return function($p4){
        return function($p5){
          return new Fay$$$(function(){
            var err = $p5;
            var succ = $p4;
            var dat = $p3;
            var rqparam = $p2;
            var ur = $p1;
            return Fay$$_(Fay$$_(Prelude.$36$)(JQuery.ajax$39$))((function(){
              var $36$_record_to_update = Object.create(Fay$$_(JQuery.defaultAjaxSettings));
              $36$_record_to_update.success = Fay$$_(Fay.FFI.Defined)(succ);
              $36$_record_to_update.data$39$ = Fay$$_(Fay$$_(Prelude.$36$)(Fay.FFI.Defined))(Fay$$_(Fay$$_(JQuery.makeRqObj)(rqparam))(dat));
              $36$_record_to_update.error$39$ = Fay$$_(Fay.FFI.Defined)(err);
              $36$_record_to_update.url = Fay$$_(Fay.FFI.Defined)(ur);
              $36$_record_to_update.type$39$ = Fay$$_(Fay.FFI.Defined)("POST");
              $36$_record_to_update.processData = Fay$$_(Fay.FFI.Defined)(false);
              $36$_record_to_update.contentType = Fay$$_(Fay.FFI.Defined)("text/json");
              $36$_record_to_update.dataType = Fay$$_(Fay.FFI.Defined)("json");
              return $36$_record_to_update;
            })());
          });
        };
      };
    };
  };
};
JQuery.makeRqObj = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay(["user","Object",[]],(function () { var o = {}; o[Fay$$fayToJs(["user","Text",[]],$p1)] = Fay$$fayToJs(["unknown"],$p2); return o; })());
    });
  };
};
JQuery._AjaxSettings = function AjaxSettings(accepts,async,beforeSend,cache,complete,contentType,crossDomain,data$39$,dataType,error$39$,$_global,ifModified,isLocal,mimeType,password,processData,success,timeout,type$39$,url,username){
  this.accepts = accepts;
  this.async = async;
  this.beforeSend = beforeSend;
  this.cache = cache;
  this.complete = complete;
  this.contentType = contentType;
  this.crossDomain = crossDomain;
  this.data$39$ = data$39$;
  this.dataType = dataType;
  this.error$39$ = error$39$;
  this.$_global = $_global;
  this.ifModified = ifModified;
  this.isLocal = isLocal;
  this.mimeType = mimeType;
  this.password = password;
  this.processData = processData;
  this.success = success;
  this.timeout = timeout;
  this.type$39$ = type$39$;
  this.url = url;
  this.username = username;
};
JQuery.AjaxSettings = function(accepts){
  return function(async){
    return function(beforeSend){
      return function(cache){
        return function(complete){
          return function(contentType){
            return function(crossDomain){
              return function(data$39$){
                return function(dataType){
                  return function(error$39$){
                    return function($_global){
                      return function(ifModified){
                        return function(isLocal){
                          return function(mimeType){
                            return function(password){
                              return function(processData){
                                return function(success){
                                  return function(timeout){
                                    return function(type$39$){
                                      return function(url){
                                        return function(username){
                                          return new Fay$$$(function(){
                                            return new JQuery._AjaxSettings(accepts,async,beforeSend,cache,complete,contentType,crossDomain,data$39$,dataType,error$39$,$_global,ifModified,isLocal,mimeType,password,processData,success,timeout,type$39$,url,username);
                                          });
                                        };
                                      };
                                    };
                                  };
                                };
                              };
                            };
                          };
                        };
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
    };
  };
};
JQuery.accepts = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).accepts;
  });
};
JQuery.async = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).async;
  });
};
JQuery.beforeSend = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).beforeSend;
  });
};
JQuery.cache = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).cache;
  });
};
JQuery.complete = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).complete;
  });
};
JQuery.contentType = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).contentType;
  });
};
JQuery.crossDomain = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).crossDomain;
  });
};
JQuery.data$39$ = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).data$39$;
  });
};
JQuery.dataType = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).dataType;
  });
};
JQuery.error$39$ = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).error$39$;
  });
};
JQuery.$_global = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).$_global;
  });
};
JQuery.ifModified = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).ifModified;
  });
};
JQuery.isLocal = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).isLocal;
  });
};
JQuery.mimeType = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).mimeType;
  });
};
JQuery.password = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).password;
  });
};
JQuery.processData = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).processData;
  });
};
JQuery.success = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).success;
  });
};
JQuery.timeout = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).timeout;
  });
};
JQuery.type$39$ = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).type$39$;
  });
};
JQuery.url = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).url;
  });
};
JQuery.username = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x).username;
  });
};
JQuery.defaultAjaxSettings = new Fay$$$(function(){
  var AjaxSettings = new JQuery._AjaxSettings();
  AjaxSettings.accepts = Fay.FFI.Undefined;
  AjaxSettings.async = Fay.FFI.Undefined;
  AjaxSettings.beforeSend = Fay.FFI.Undefined;
  AjaxSettings.cache = Fay.FFI.Undefined;
  AjaxSettings.complete = Fay.FFI.Undefined;
  AjaxSettings.contentType = Fay.FFI.Undefined;
  AjaxSettings.crossDomain = Fay.FFI.Undefined;
  AjaxSettings.data$39$ = Fay.FFI.Undefined;
  AjaxSettings.dataType = Fay.FFI.Undefined;
  AjaxSettings.error$39$ = Fay.FFI.Undefined;
  AjaxSettings.$_global = Fay.FFI.Undefined;
  AjaxSettings.ifModified = Fay.FFI.Undefined;
  AjaxSettings.isLocal = Fay.FFI.Undefined;
  AjaxSettings.mimeType = Fay.FFI.Undefined;
  AjaxSettings.password = Fay.FFI.Undefined;
  AjaxSettings.processData = Fay.FFI.Undefined;
  AjaxSettings.success = Fay.FFI.Undefined;
  AjaxSettings.timeout = Fay.FFI.Undefined;
  AjaxSettings.type$39$ = Fay.FFI.Undefined;
  AjaxSettings.url = Fay.FFI.Undefined;
  AjaxSettings.username = Fay.FFI.Undefined;
  return AjaxSettings;
});
JQuery.ajax$39$ = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["unknown"], (function (o) {  delete o['instance'];  for (var p in o) {  if (/\$39\$/.test(p)) {  o[p.replace(/\$39\$/g, '')] = o[p];  delete o[p];  }  }  return jQuery.ajax(o);  })(Fay$$fayToJs(["user","AjaxSettings",[["automatic"],["automatic"]]],$p1))));
  });
};
JQuery.addClass = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['addClass'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.addClassWith = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['addClass'](Fay$$fayToJs(["function",[["double"],["user","Text",[]],["action",[["user","Text",[]]]]]],$p1))));
    });
  };
};
JQuery.getAttr = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","Text",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['attr'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.setAttr = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p3)['attr'](Fay$$fayToJs(["user","Text",[]],$p1), Fay$$fayToJs(["user","Text",[]],$p2))));
      });
    };
  };
};
JQuery.setAttrWith = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p3)['attr'](Fay$$fayToJs(["user","Text",[]],$p1), Fay$$fayToJs(["function",[["double"],["user","Text",[]],["action",[["user","Text",[]]]]]],$p2))));
      });
    };
  };
};
JQuery.hasClass = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay_bool(Fay$$fayToJs(["user","JQuery",[]],$p2)['hasClass'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.getHtml = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","Text",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['html']()));
  });
};
JQuery.setHtml = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['html'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.setHtmlWith = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['html'](Fay$$fayToJs(["function",[["double"],["user","Text",[]],["action",[["user","JQuery",[]]]]]],$p1))));
    });
  };
};
JQuery.getProp = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","Text",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['prop'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.setProp = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p3)['prop'](Fay$$fayToJs(["user","Text",[]],$p1), Fay$$fayToJs(["user","Text",[]],$p2))));
      });
    };
  };
};
JQuery.setPropWith = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p3)['prop'](Fay$$fayToJs(["user","Text",[]],$p1), Fay$$fayToJs(["function",[["double"],["user","Text",[]],["action",[["user","Text",[]]]]]],$p2))));
      });
    };
  };
};
JQuery.removeAttr = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['removeAttr'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.removeClass = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['removeClass'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.removeClassWith = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['removeClass'](Fay$$fayToJs(["function",[["double"],["user","Text",[]],["action",[["user","JQuery",[]]]]]],$p1))));
    });
  };
};
JQuery.removeProp = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['removeProp'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.toggleClass = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['toggleClass'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.toggleClassBool = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p3)['toggleClass'](Fay$$fayToJs(["user","Text",[]],$p1), Fay$$fayToJs_bool($p2))));
      });
    };
  };
};
JQuery.toggleAllClasses = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['toggleClass'](Fay$$fayToJs_bool($p1))));
    });
  };
};
JQuery.toggleClassWith = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['toggleClass'](Fay$$fayToJs(["function",[["double"],["user","Text",[]],["bool"],["action",[["user","JQuery",[]]]]]],$p1))));
    });
  };
};
JQuery.toggleClassBoolWith = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p3)['toggleClass'](Fay$$fayToJs(["function",[["double"],["user","Text",[]],["bool"],["action",[["user","JQuery",[]]]]]],$p1), Fay$$fayToJs_bool($p2))));
      });
    };
  };
};
JQuery.getVal = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","Text",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['val']()));
  });
};
JQuery.setVal = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['val'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.setValWith = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['val'](Fay$$fayToJs(["function",[["double"],["user","Text",[]],["action",[["user","JQuery",[]]]]]],$p1))));
    });
  };
};
JQuery.setText = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['text'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.setTextWith = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['text'](Fay$$fayToJs(["function",[["double"],["user","Text",[]],["action",[["user","JQuery",[]]]]]],$p1))));
    });
  };
};
JQuery.getText = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","Text",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['text']()));
  });
};
JQuery.holdReady = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],jQuery['holdReady'](Fay$$fayToJs_bool($p1))));
  });
};
JQuery.selectElement = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],jQuery(Fay$$fayToJs(["user","Element",[]],$p1))));
  });
};
JQuery.selectObject = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],jQuery(Fay$$fayToJs(["unknown"],$p1))));
  });
};
JQuery.select = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],jQuery(Fay$$fayToJs(["user","Text",[]],$p1))));
  });
};
JQuery.selectEmpty = new Fay$$$(function(){
  return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],jQuery()));
});
JQuery.createJQuery = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],jQuery(Fay$$fayToJs(["user","Text",[]],$p1), Fay$$fayToJs(["unknown"],$p2))));
    });
  };
};
JQuery.ready = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["unknown"],jQuery(Fay$$fayToJs(["action",[["unknown"]]],$p1))));
  });
};
JQuery.noConflict = new Fay$$$(function(){
  return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],jQuery['noConflict']()));
});
JQuery.noConflictBool = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],jQuery['noConflict'](Fay$$fayToJs_bool($p1))));
  });
};
JQuery.getCss = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","Text",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['css'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.setCss = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p3)['css'](Fay$$fayToJs(["user","Text",[]],$p1), Fay$$fayToJs(["user","Text",[]],$p2))));
      });
    };
  };
};
JQuery.setCssWith = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p3)['css'](Fay$$fayToJs(["user","Text",[]],$p1), Fay$$fayToJs(["function",[["double"],["user","Text",[]],["action",[["user","Text",[]]]]]],$p2))));
      });
    };
  };
};
JQuery.getHeight = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay_double(Fay$$fayToJs(["user","JQuery",[]],$p1)['height']()));
  });
};
JQuery.setHeight = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['height'](Fay$$fayToJs_double($p1))));
    });
  };
};
JQuery.setHeightWith = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['height'](Fay$$fayToJs(["function",[["double"],["double"],["action",[["double"]]]]],$p1))));
    });
  };
};
JQuery.getInnerHeight = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay_double(Fay$$fayToJs(["user","JQuery",[]],$p1)['innerHeight']()));
  });
};
JQuery.getInnerWidth = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay_double(Fay$$fayToJs(["user","JQuery",[]],$p1)['innerWidth']()));
  });
};
JQuery.getOuterHeight = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay_double(Fay$$fayToJs(["user","JQuery",[]],$p1)['outerHeight']()));
  });
};
JQuery.getOuterHeightBool = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay_double(Fay$$fayToJs(["user","JQuery",[]],$p2)['outerHeight'](Fay$$fayToJs_bool($p1))));
    });
  };
};
JQuery.getOuterWidth = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay_double(Fay$$fayToJs(["user","JQuery",[]],$p1)['outerWidth']()));
  });
};
JQuery.getOuterWidthBool = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay_double(Fay$$fayToJs(["user","JQuery",[]],$p2)['outerWidth'](Fay$$fayToJs_bool($p1))));
    });
  };
};
JQuery.getScrollLeft = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay_double(Fay$$fayToJs(["user","JQuery",[]],$p1)['scrollLeft']()));
  });
};
JQuery.setScrollLeft = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['scrollLeft'](Fay$$fayToJs_double($p1))));
    });
  };
};
JQuery.getScrollTop = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay_double(Fay$$fayToJs(["user","JQuery",[]],$p1)['scrollTop']()));
  });
};
JQuery.setScrollTop = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['scrollTop'](Fay$$fayToJs_double($p1))));
    });
  };
};
JQuery.getWidth = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay_double(Fay$$fayToJs(["user","JQuery",[]],$p1)['width']()));
  });
};
JQuery.setWidth = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['width'](Fay$$fayToJs_double($p1))));
    });
  };
};
JQuery.setWidthWith = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['width'](Fay$$fayToJs(["function",[["double"],["double"],["action",[["double"]]]]],$p1))));
    });
  };
};
JQuery._Show = function Show(){
};
JQuery.Show = new Fay$$$(function(){
  return new JQuery._Show();
});
JQuery._Hide = function Hide(){
};
JQuery.Hide = new Fay$$$(function(){
  return new JQuery._Hide();
});
JQuery._Toggle = function Toggle(){
};
JQuery.Toggle = new Fay$$$(function(){
  return new JQuery._Toggle();
});
JQuery._FadeIn = function FadeIn(){
};
JQuery.FadeIn = new Fay$$$(function(){
  return new JQuery._FadeIn();
});
JQuery._FadeOut = function FadeOut(){
};
JQuery.FadeOut = new Fay$$$(function(){
  return new JQuery._FadeOut();
});
JQuery._FadeToggle = function FadeToggle(){
};
JQuery.FadeToggle = new Fay$$$(function(){
  return new JQuery._FadeToggle();
});
JQuery._Instantly = function Instantly(){
};
JQuery.Instantly = new Fay$$$(function(){
  return new JQuery._Instantly();
});
JQuery._Slow = function Slow(){
};
JQuery.Slow = new Fay$$$(function(){
  return new JQuery._Slow();
});
JQuery._Fast = function Fast(){
};
JQuery.Fast = new Fay$$$(function(){
  return new JQuery._Fast();
});
JQuery._Speed = function Speed(slot1){
  this.slot1 = slot1;
};
JQuery.Speed = function(slot1){
  return new Fay$$$(function(){
    return new JQuery._Speed(slot1);
  });
};
JQuery._Animation = function Animation(_type,_speed,_nextAnimation,_element){
  this._type = _type;
  this._speed = _speed;
  this._nextAnimation = _nextAnimation;
  this._element = _element;
};
JQuery.Animation = function(_type){
  return function(_speed){
    return function(_nextAnimation){
      return function(_element){
        return new Fay$$$(function(){
          return new JQuery._Animation(_type,_speed,_nextAnimation,_element);
        });
      };
    };
  };
};
JQuery._type = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x)._type;
  });
};
JQuery._speed = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x)._speed;
  });
};
JQuery._nextAnimation = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x)._nextAnimation;
  });
};
JQuery._element = function(x){
  return new Fay$$$(function(){
    return Fay$$_(x)._element;
  });
};
JQuery.anim = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var el = $p2;
      var ty = $p1;
      return Fay$$_(Fay$$_(Fay$$_(Fay$$_(JQuery.Animation)(ty))(JQuery.Fast))(Prelude.Nothing))(el);
    });
  };
};
JQuery.speed = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var ani = $p2;
      var spd = $p1;
      return (function(){
        var $36$_record_to_update = Object.create(Fay$$_(ani));
        $36$_record_to_update._speed = spd;
        return $36$_record_to_update;
      })();
    });
  };
};
JQuery.chainAnim = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var a2 = $p2;
      var a1 = $p1;
      return (function(){
        var $36$_record_to_update = Object.create(Fay$$_(a1));
        $36$_record_to_update._nextAnimation = Fay$$_(Prelude.Just)(a2);
        return $36$_record_to_update;
      })();
    });
  };
};
JQuery.chainAnims = function($p1){
  return new Fay$$$(function(){
    if (Fay$$listLen(Fay$$_($p1),1)) {
      var a = Fay$$index(0,Fay$$_($p1));
      return a;
    }
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      var a = $tmp1.car;
      var as = $tmp1.cdr;
      return Fay$$_(Fay$$_(JQuery.chainAnim)(a))(Fay$$_(JQuery.chainAnims)(as));
    }
    if (Fay$$_($p1) === null) {
      return Fay$$_(Prelude.error)(Fay$$_(Fay.Text.Type.unpack)("chainAnims: empty list"));
    }
    throw ["unhandled case in chainAnims",[$p1]];
  });
};
JQuery.runAnimation = function($p1){
  return new Fay$$$(function(){
    var a = $p1;
    return (function(){
      var cb = new Fay$$$(function(){
        return (function($tmp1){
          if (Fay$$_($tmp1) instanceof Prelude._Just) {
            var a2 = Fay$$_($tmp1).slot1;
            return Fay$$_(Prelude.$_const)(Fay$$_(JQuery.runAnimation)(a2));
          }
          if (Fay$$_($tmp1) instanceof Prelude._Nothing) {
            return Fay$$_(Prelude.$_const)(Fay$$_(Fay$$$_return)(Fay$$unit));
          }
          return (function(){ throw (["unhandled case",$tmp1]); })();
        })(Fay$$_(JQuery._nextAnimation)(a));
      });
      return Fay$$_(Fay$$_(Fay$$then)(Fay$$_(Fay$$_(Fay$$_(Fay$$_(JQuery.animate)(Fay$$_(JQuery._type)(a)))(Fay$$_(JQuery._speed)(a)))(cb))(Fay$$_(JQuery._element)(a))))(Fay$$_(Fay$$$_return)(Fay$$unit));
    })();
  });
};
JQuery.animate = function($p1){
  return function($p2){
    return function($p3){
      return function($p4){
        return new Fay$$$(function(){
          return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p4)[(function () {  switch (Fay$$fayToJs(["user","AnimationType",[]],$p1)['instance']) {  case 'FadeIn': return 'fadeIn';  case 'FadeOut': return 'fadeOut';  case 'FadeToggle': return 'fadeToggle';  default: return Fay$$fayToJs(["user","AnimationType",[]],$p1)['instance']['toLowerCase']();  }  })()]((function () {  if (Fay$$fayToJs(["user","Speed",[]],$p2)['instance'] == 'Slow') {  return 'slow';  } else if (Fay$$fayToJs(["user","Speed",[]],$p2)['instance'] == 'Instantly') {  return null;  } else if (Fay$$fayToJs(["user","Speed",[]],$p2)['instance'] == 'Fast') {  return 'fast';  } else {  return Fay$$fayToJs(["user","Speed",[]],$p2)['slot1'];  }  })(), function() {  Fay$$fayToJs(["function",[["user","JQuery",[]],["action",[["unknown"]]]]],$p3)(jQuery(this));  })));
        });
      };
    };
  };
};
JQuery.hide = function($p1){
  return new Fay$$$(function(){
    var spd = $p1;
    return Fay$$_(Fay$$_(Fay$$_(JQuery.animate)(JQuery.Hide))(spd))(JQuery.emptyCallback);
  });
};
JQuery.unhide = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['show']()));
  });
};
JQuery.jshow = function($p1){
  return new Fay$$$(function(){
    var spd = $p1;
    return Fay$$_(Fay$$_(Fay$$_(JQuery.animate)(JQuery.Show))(spd))(JQuery.emptyCallback);
  });
};
JQuery.toggle = function($p1){
  return new Fay$$$(function(){
    var spd = $p1;
    return Fay$$_(Fay$$_(Fay$$_(JQuery.animate)(JQuery.Toggle))(spd))(JQuery.emptyCallback);
  });
};
JQuery.fadeIn = function($p1){
  return new Fay$$$(function(){
    var spd = $p1;
    return Fay$$_(Fay$$_(Fay$$_(JQuery.animate)(JQuery.FadeIn))(spd))(JQuery.emptyCallback);
  });
};
JQuery.fadeOut = function($p1){
  return new Fay$$$(function(){
    var spd = $p1;
    return Fay$$_(Fay$$_(Fay$$_(JQuery.animate)(JQuery.FadeOut))(spd))(JQuery.emptyCallback);
  });
};
JQuery.fadeToggle = function($p1){
  return new Fay$$$(function(){
    var spd = $p1;
    return Fay$$_(Fay$$_(Fay$$_(JQuery.animate)(JQuery.FadeToggle))(spd))(JQuery.emptyCallback);
  });
};
JQuery.resize = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","JQuery",[]],$p2)['resize'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.scroll = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","JQuery",[]],$p2)['scroll'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.load = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","JQuery",[]],$p2)['load'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.documentReady = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],jQuery(Fay$$fayToJs(["user","Document",[]],$p2))['ready'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.unload = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],jQuery(Fay$$fayToJs(["user","Window",[]],$p2))['unload'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.click = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['click'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.dblclick = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['dblclick'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.focusin = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['focusin'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.focusout = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['focusout'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.hover = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['hover'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.mousedown = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['mousedown'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.mouseenter = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['mouseenter'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.mouseleave = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['mouseleave'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.mousemove = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['mousemove'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.mouseout = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['mouseout'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.mouseover = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['mouseover'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.mouseup = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['mouseup'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.toggleEvents = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","JQuery",[]],$p2)['toggle']['apply'](Fay$$fayToJs(["user","JQuery",[]],$p2), Fay$$fayToJs(["list",[["function",[["user","Event",[]],["action",[["unknown"]]]]]]],$p1))));
    });
  };
};
JQuery.bind = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","JQuery",[]],$p3)['bind'](Fay$$fayToJs(["user","EventType",[]],$p1), Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p2))));
      });
    };
  };
};
JQuery.bindPreventBubble = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","JQuery",[]],$p3)['bind'](Fay$$fayToJs(["user","EventType",[]],$p1),Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p2),false)));
      });
    };
  };
};
JQuery.on = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","JQuery",[]],$p3)['on'](Fay$$fayToJs(["user","EventType",[]],$p1), Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p2))));
      });
    };
  };
};
JQuery.onDelegate = function($p1){
  return function($p2){
    return function($p3){
      return function($p4){
        return new Fay$$$(function(){
          return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","JQuery",[]],$p4)['on'](Fay$$fayToJs(["user","EventType",[]],$p1),Fay$$fayToJs(["user","Selector",[]],$p2),Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p3))));
        });
      };
    };
  };
};
JQuery.one = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","JQuery",[]],$p3)['one'](Fay$$fayToJs(["user","EventType",[]],$p1), Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p2))));
      });
    };
  };
};
JQuery.trigger = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","JQuery",[]],$p2)['trigger'](Fay$$fayToJs(["user","EventType",[]],$p1))));
    });
  };
};
JQuery.triggerHandler = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","JQuery",[]],$p2)['triggerHandler'](Fay$$fayToJs(["user","EventType",[]],$p1))));
    });
  };
};
JQuery.delegateTarget = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","Element",[]],jQuery(Fay$$fayToJs(["user","Event",[]],$p1)['delegateTarget'])));
  });
};
JQuery.isDefaultPrevented = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay_bool(Fay$$fayToJs(["user","Event",[]],$p1)['isDefaultPrevented']()));
  });
};
JQuery.isImmediatePropagationStopped = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay_bool(Fay$$fayToJs(["user","Event",[]],$p1)['isImmediatePropagationStopped']()));
  });
};
JQuery.isPropagationStopped = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","Element",[]],Fay$$fayToJs(["user","Event",[]],$p1)['isPropagationStopped']()));
  });
};
JQuery.namespace = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","Text",[]],Fay$$fayToJs(["user","Event",[]],$p1)['namespace']));
  });
};
JQuery.pageX = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay_double(Fay$$fayToJs(["user","Event",[]],$p1)['pageX']));
  });
};
JQuery.pageY = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay_double(Fay$$fayToJs(["user","Event",[]],$p1)['pageY']));
  });
};
JQuery.preventDefault = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","Event",[]],$p1)['preventDefault']()));
  });
};
JQuery.target = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","Element",[]],Fay$$fayToJs(["user","Event",[]],$p1)['target']));
  });
};
JQuery.timeStamp = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay_double(Fay$$fayToJs(["user","Event",[]],$p1)['timeStamp']));
  });
};
JQuery.eventType = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","Text",[]],Fay$$fayToJs(["user","Event",[]],$p1)['type']));
  });
};
JQuery.which = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay_int(Fay$$fayToJs(["user","Event",[]],$p1)['which']));
  });
};
JQuery.blur = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","JQuery",[]],$p2)['blur'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.change = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","JQuery",[]],$p2)['change'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.onFocus = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","JQuery",[]],$p2)['focus'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.focus = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['focus']()));
  });
};
JQuery.onselect = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","JQuery",[]],$p2)['select'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.submit = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","JQuery",[]],$p2)['submit'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.keydown = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","JQuery",[]],$p2)['keydown'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.keypress = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","JQuery",[]],$p2)['keypress'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.keyup = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","JQuery",[]],$p2)['keyup'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["unknown"]]]]],$p1))));
    });
  };
};
JQuery.after = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['after'](Fay$$fayToJs(["unknown"],$p1))));
    });
  };
};
JQuery.afterWith = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['after'](Fay$$fayToJs(["function",[["double"],["action",[["user","JQuery",[]]]]]],$p1))));
    });
  };
};
JQuery.append = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['append'](Fay$$fayToJs(["unknown"],$p1))));
    });
  };
};
JQuery.appendJQuery = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['append'](Fay$$fayToJs(["user","JQuery",[]],$p1))));
    });
  };
};
JQuery.appendWith = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['append'](Fay$$fayToJs(["function",[["double"],["action",[["user","JQuery",[]]]]]],$p1))));
    });
  };
};
JQuery.appendTo = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['appendTo'](Fay$$fayToJs(["unknown"],$p1))));
    });
  };
};
JQuery.appendToJQuery = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['appendTo'](Fay$$fayToJs(["user","JQuery",[]],$p1))));
    });
  };
};
JQuery.before = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['before'](Fay$$fayToJs(["unknown"],$p1))));
    });
  };
};
JQuery.beforeWith = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['before'](Fay$$fayToJs(["function",[["double"],["action",[["user","JQuery",[]]]]]],$p1))));
    });
  };
};
JQuery._WithoutDataAndEvents = function WithoutDataAndEvents(){
};
JQuery.WithoutDataAndEvents = new Fay$$$(function(){
  return new JQuery._WithoutDataAndEvents();
});
JQuery._WithDataAndEvents = function WithDataAndEvents(){
};
JQuery.WithDataAndEvents = new Fay$$$(function(){
  return new JQuery._WithDataAndEvents();
});
JQuery._DeepWithDataAndEvents = function DeepWithDataAndEvents(){
};
JQuery.DeepWithDataAndEvents = new Fay$$$(function(){
  return new JQuery._DeepWithDataAndEvents();
});
JQuery.clone = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) instanceof JQuery._WithoutDataAndEvents) {
      return function($p1){
        return new Fay$$$(function(){
          return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['clone'](false)));
        });
      };
    }
    if (Fay$$_($p1) instanceof JQuery._WithDataAndEvents) {
      return function($p1){
        return new Fay$$$(function(){
          return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['clone'](true, false)));
        });
      };
    }
    if (Fay$$_($p1) instanceof JQuery._DeepWithDataAndEvents) {
      return function($p1){
        return new Fay$$$(function(){
          return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['clone'](true, true)));
        });
      };
    }
    throw ["unhandled case in clone",[$p1]];
  });
};
JQuery.detach = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['detach']()));
  });
};
JQuery.detachSelector = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['detach'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.empty = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['empty']()));
  });
};
JQuery.insertAfter = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['insertAfter'](Fay$$fayToJs(["unknown"],$p1))));
    });
  };
};
JQuery.insertBefore = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['insertBefore'](Fay$$fayToJs(["unknown"],$p1))));
    });
  };
};
JQuery.prepend = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['prepend'](Fay$$fayToJs(["unknown"],$p1))));
    });
  };
};
JQuery.prependWith = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['prepend'](Fay$$fayToJs(["function",[["double"],["action",[["user","JQuery",[]]]]]],$p1))));
    });
  };
};
JQuery.prependTo = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['prependTo'](Fay$$fayToJs(["unknown"],$p1))));
    });
  };
};
JQuery.remove = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['remove']()));
  });
};
JQuery.removeSelector = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['remove'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.replaceAll = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['replaceAll'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.replaceWith = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['replaceWith'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.replaceWithJQuery = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['replaceWith'](Fay$$fayToJs(["user","JQuery",[]],$p1))));
    });
  };
};
JQuery.replaceWithWith = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['replaceWith'](Fay$$fayToJs(["action",[["user","JQuery",[]]]],$p1))));
    });
  };
};
JQuery.unwrap = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['unwrap']()));
  });
};
JQuery.wrap = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['wrap'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.wrapWith = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['wrap'](Fay$$fayToJs(["function",[["double"],["action",[["user","JQuery",[]]]]]],$p1))));
    });
  };
};
JQuery.wrapAllHtml = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['wrapAll'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.wrapAllSelector = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['wrapAll'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.wrapAllElement = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['wrapAll'](Fay$$fayToJs(["user","Element",[]],$p1))));
    });
  };
};
JQuery.wrapInnerHtml = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['wrapInner'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.wrapInnerSelector = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['wrapInner'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.wrapInnerElement = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['wrapInner'](Fay$$fayToJs(["user","Element",[]],$p1))));
    });
  };
};
JQuery.addSelector = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['add'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.addElement = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['add'](Fay$$fayToJs(["user","Element",[]],$p1))));
    });
  };
};
JQuery.addHtml = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['add'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.add = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['add'](Fay$$fayToJs(["user","JQuery",[]],$p1))));
    });
  };
};
JQuery.addSelectorWithContext = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p3)['add'](Fay$$fayToJs(["user","Text",[]],$p1), Fay$$fayToJs(["user","JQuery",[]],$p2))));
      });
    };
  };
};
JQuery.andSelf = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['andSelf']()));
  });
};
JQuery.children = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['children']()));
  });
};
JQuery.childrenMatching = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['children'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.closestSelector = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['closest'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.closestWithContext = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p3)['closest'](Fay$$fayToJs(["user","Text",[]],$p1), Fay$$fayToJs(["user","Text",[]],$p2))));
      });
    };
  };
};
JQuery.closest = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['closest'](Fay$$fayToJs(["user","JQuery",[]],$p1))));
    });
  };
};
JQuery.closestElement = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['closest'](Fay$$fayToJs(["user","Element",[]],$p1))));
    });
  };
};
JQuery.contents = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['contents']()));
  });
};
JQuery.each = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['each'](Fay$$fayToJs(["function",[["double"],["user","Element",[]],["action",[["bool"]]]]],$p1))));
    });
  };
};
JQuery.end = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['end']()));
  });
};
JQuery.eq = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['eq'](Fay$$fayToJs_double($p1))));
    });
  };
};
JQuery.filter = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['filter'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.filterWith = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['filter'](Fay$$fayToJs(["function",[["double"],["action",[["bool"]]]]],$p1))));
    });
  };
};
JQuery.filterElement = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['filter'](Fay$$fayToJs(["user","Element",[]],$p1))));
    });
  };
};
JQuery.filterJQuery = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['filter'](Fay$$fayToJs(["user","JQuery",[]],$p1))));
    });
  };
};
JQuery.findSelector = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['find'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.findJQuery = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['find'](Fay$$fayToJs(["user","JQuery",[]],$p1))));
    });
  };
};
JQuery.findElement = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['find'](Fay$$fayToJs(["user","Element",[]],$p1))));
    });
  };
};
JQuery.first = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['first']()));
  });
};
JQuery.has = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['has'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.hasElement = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['has'](Fay$$fayToJs(["user","Element",[]],$p1))));
    });
  };
};
JQuery.is = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['is'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.isWith = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['is'](Fay$$fayToJs(["function",[["double"],["bool"]]],$p1))));
    });
  };
};
JQuery.isJQuery = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['is'](Fay$$fayToJs(["user","JQuery",[]],$p1))));
    });
  };
};
JQuery.isElement = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['is'](Fay$$fayToJs(["user","Element",[]],$p1))));
    });
  };
};
JQuery.last = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['last']()));
  });
};
JQuery.jQueryMap = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['map'](Fay$$fayToJs(["function",[["double"],["user","Element",[]],["action",[["user","JQuery",[]]]]]],$p1))));
    });
  };
};
JQuery.next = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['next']()));
  });
};
JQuery.nextSelector = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['next'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.nextAll = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['nextAll']()));
  });
};
JQuery.nextAllSelector = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['nextAll'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.nextUntil = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['nextUntil'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.nextUntilFiltered = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p3)['nextUntil'](Fay$$fayToJs(["user","Text",[]],$p1), Fay$$fayToJs(["user","Text",[]],$p2))));
      });
    };
  };
};
JQuery.nextUntilElement = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['nextUntil'](Fay$$fayToJs(["user","Element",[]],$p1))));
    });
  };
};
JQuery.nextUntilElementFiltered = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p3)['nextUntil'](Fay$$fayToJs(["user","Element",[]],$p1), Fay$$fayToJs(["user","Text",[]],$p2))));
      });
    };
  };
};
JQuery.not = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['not'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.notElement = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['not'](Fay$$fayToJs(["user","Element",[]],$p1))));
    });
  };
};
JQuery.notElements = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['not'](Fay$$fayToJs(["list",[["user","Element",[]]]],$p1))));
    });
  };
};
JQuery.notWith = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['not'](Fay$$fayToJs(["function",[["double"],["bool"]]],$p1))));
    });
  };
};
JQuery.notJQuery = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['not'](Fay$$fayToJs(["user","JQuery",[]],$p1))));
    });
  };
};
JQuery.offsetParent = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['offsetParent']()));
  });
};
JQuery.parent = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['parent']()));
  });
};
JQuery.parentSelector = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['parent'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.parents = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['parents']()));
  });
};
JQuery.parentsSelector = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['parents'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.parentsUntil = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['parentsUntil'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.parentsUntilFiltered = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p3)['parentsUntil'](Fay$$fayToJs(["user","Text",[]],$p1), Fay$$fayToJs(["user","Text",[]],$p2))));
      });
    };
  };
};
JQuery.parentsUntilElement = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['parentsUntil'](Fay$$fayToJs(["user","Element",[]],$p1))));
    });
  };
};
JQuery.parentsUntilElementFiltered = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p3)['parentsUntil'](Fay$$fayToJs(["user","Element",[]],$p1), Fay$$fayToJs(["user","Text",[]],$p2))));
      });
    };
  };
};
JQuery.prev = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['prev']()));
  });
};
JQuery.prevSelector = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['prev'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.prevAll = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['prevAll']()));
  });
};
JQuery.prevAllSelector = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['prevAll'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.prevUntil = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['prevUntil'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.prevUntilFiltered = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p3)['prevUntil'](Fay$$fayToJs(["user","Text",[]],$p1), Fay$$fayToJs(["user","Text",[]],$p2))));
      });
    };
  };
};
JQuery.prevUntilElement = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['prevUntil'](Fay$$fayToJs(["user","Element",[]],$p1))));
    });
  };
};
JQuery.prevUntilElementFiltered = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p3)['prevUntil'](Fay$$fayToJs(["user","Element",[]],$p1), Fay$$fayToJs(["user","Text",[]],$p2))));
      });
    };
  };
};
JQuery.siblings = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['siblings']()));
  });
};
JQuery.siblingsSelector = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['siblings'](Fay$$fayToJs(["user","Text",[]],$p1))));
    });
  };
};
JQuery.slice = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['slice'](Fay$$fayToJs_double($p1))));
    });
  };
};
JQuery.sliceFromTo = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p3)['slice'](Fay$$fayToJs_double($p1), Fay$$fayToJs_double($p2))));
      });
    };
  };
};
JQuery._KeyUp = function KeyUp(){
};
JQuery.KeyUp = new Fay$$$(function(){
  return new JQuery._KeyUp();
});
JQuery._KeyDown = function KeyDown(){
};
JQuery.KeyDown = new Fay$$$(function(){
  return new JQuery._KeyDown();
});
JQuery._KeyLeft = function KeyLeft(){
};
JQuery.KeyLeft = new Fay$$$(function(){
  return new JQuery._KeyLeft();
});
JQuery._KeyRight = function KeyRight(){
};
JQuery.KeyRight = new Fay$$$(function(){
  return new JQuery._KeyRight();
});
JQuery._KeyRet = function KeyRet(){
};
JQuery.KeyRet = new Fay$$$(function(){
  return new JQuery._KeyRet();
});
JQuery._SomeKey = function SomeKey(slot1){
  this.slot1 = slot1;
};
JQuery.SomeKey = function(slot1){
  return new Fay$$$(function(){
    return new JQuery._SomeKey(slot1);
  });
};
JQuery.onKeycode = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var el = $p2;
      var callback = $p1;
      return Fay$$_(Fay$$_(JQuery._onKeycode)(function($p1){
        var code = $p1;
        return Fay$$_(callback)((function($tmp1){
          if (Fay$$_($tmp1) === 38) {
            return JQuery.KeyUp;
          }
          if (Fay$$_($tmp1) === 40) {
            return JQuery.KeyDown;
          }
          if (Fay$$_($tmp1) === 37) {
            return JQuery.KeyLeft;
          }
          if (Fay$$_($tmp1) === 39) {
            return JQuery.KeyRight;
          }
          if (Fay$$_($tmp1) === 13) {
            return JQuery.KeyRet;
          }
          return Fay$$_(JQuery.SomeKey)(code);
        })(code));
      }))(el);
    });
  };
};
JQuery._onKeycode = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['keycode'](Fay$$fayToJs(["function",[["double"],["action",[["bool"]]]]],$p1))));
    });
  };
};
JQuery.unKeycode = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['unkeycode']()));
  });
};
JQuery.onClick = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['click'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["bool"]]]]],$p1))));
    });
  };
};
JQuery.onChange = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['change'](Fay$$fayToJs(["action",[["unknown"]]],$p1))));
    });
  };
};
JQuery.onSubmit = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['submit'](Fay$$fayToJs(["action",[["bool"]]],$p1))));
    });
  };
};
JQuery.eventX = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay_double(Fay$$fayToJs(["user","Event",[]],$p1)['pageX'] - Fay$$fayToJs(["user","JQuery",[]],$p2)['get'](0)['offsetLeft']);
    });
  };
};
JQuery.eventY = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay_double(Fay$$fayToJs(["user","Event",[]],$p1)['pageY'] - Fay$$fayToJs(["user","JQuery",[]],$p2)['get'](0)['offsetTop']);
    });
  };
};
JQuery.onDblClick = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['dblclick'](Fay$$fayToJs(["function",[["user","Event",[]],["action",[["bool"]]]]],$p1))));
    });
  };
};
JQuery.setDraggable = function($p1){
  return new Fay$$$(function(){
    return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p1)['draggable']()));
  });
};
JQuery.validate = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$fayToJs(["user","JQuery",[]],$p1)['validate']({ "submitHandler": Fay$$fayToJs(["action",[["unknown"]]],$p2) })));
    });
  };
};
JQuery.onLivechange = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return new Fay$$Monad(Fay$$jsToFay(["user","JQuery",[]],Fay$$fayToJs(["user","JQuery",[]],$p2)['livechange'](50,Fay$$fayToJs(["action",[["unknown"]]],$p1))));
    });
  };
};
Fay$$objConcat(Fay$$fayToJsHash,{"AjaxSettings": function(type,argTypes,_obj){
  var obj_ = {"instance": "AjaxSettings"};
  var obj_accepts = Fay$$fayToJs(["defined",[["user","Text",[]]]],_obj.accepts);
  if (undefined !== obj_accepts) {
    obj_['accepts'] = obj_accepts;
  }
  var obj_async = Fay$$fayToJs(["defined",[["bool"]]],_obj.async);
  if (undefined !== obj_async) {
    obj_['async'] = obj_async;
  }
  var obj_beforeSend = Fay$$fayToJs(["defined",[["function",[["user","JQXHR",[]],["user","AjaxSettings",[argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],argTypes && (argTypes)[1] ? (argTypes)[1] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"]]],["action",[argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"]]]]]]],_obj.beforeSend);
  if (undefined !== obj_beforeSend) {
    obj_['beforeSend'] = obj_beforeSend;
  }
  var obj_cache = Fay$$fayToJs(["defined",[["bool"]]],_obj.cache);
  if (undefined !== obj_cache) {
    obj_['cache'] = obj_cache;
  }
  var obj_complete = Fay$$fayToJs(["defined",[["function",[["user","JQXHR",[]],["user","Text",[]],["action",[argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"]]]]]]],_obj.complete);
  if (undefined !== obj_complete) {
    obj_['complete'] = obj_complete;
  }
  var obj_contentType = Fay$$fayToJs(["defined",[["user","Text",[]]]],_obj.contentType);
  if (undefined !== obj_contentType) {
    obj_['contentType'] = obj_contentType;
  }
  var obj_crossDomain = Fay$$fayToJs(["defined",[["bool"]]],_obj.crossDomain);
  if (undefined !== obj_crossDomain) {
    obj_['crossDomain'] = obj_crossDomain;
  }
  var obj_data$39$ = Fay$$fayToJs(["defined",[argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"]]],_obj.data$39$);
  if (undefined !== obj_data$39$) {
    obj_['data$39$'] = obj_data$39$;
  }
  var obj_dataType = Fay$$fayToJs(["defined",[["user","Text",[]]]],_obj.dataType);
  if (undefined !== obj_dataType) {
    obj_['dataType'] = obj_dataType;
  }
  var obj_error$39$ = Fay$$fayToJs(["defined",[["function",[["user","JQXHR",[]],["user","Maybe",[["user","Text",[]]]],["user","Maybe",[["user","Text",[]]]],["action",[argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"]]]]]]],_obj.error$39$);
  if (undefined !== obj_error$39$) {
    obj_['error$39$'] = obj_error$39$;
  }
  var obj_global = Fay$$fayToJs(["defined",[["bool"]]],_obj.$_global);
  if (undefined !== obj_global) {
    obj_['$_global'] = obj_global;
  }
  var obj_ifModified = Fay$$fayToJs(["defined",[["bool"]]],_obj.ifModified);
  if (undefined !== obj_ifModified) {
    obj_['ifModified'] = obj_ifModified;
  }
  var obj_isLocal = Fay$$fayToJs(["defined",[["bool"]]],_obj.isLocal);
  if (undefined !== obj_isLocal) {
    obj_['isLocal'] = obj_isLocal;
  }
  var obj_mimeType = Fay$$fayToJs(["defined",[["user","Text",[]]]],_obj.mimeType);
  if (undefined !== obj_mimeType) {
    obj_['mimeType'] = obj_mimeType;
  }
  var obj_password = Fay$$fayToJs(["defined",[["user","Text",[]]]],_obj.password);
  if (undefined !== obj_password) {
    obj_['password'] = obj_password;
  }
  var obj_processData = Fay$$fayToJs(["defined",[["bool"]]],_obj.processData);
  if (undefined !== obj_processData) {
    obj_['processData'] = obj_processData;
  }
  var obj_success = Fay$$fayToJs(["defined",[["function",[argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],["action",[argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"]]]]]]],_obj.success);
  if (undefined !== obj_success) {
    obj_['success'] = obj_success;
  }
  var obj_timeout = Fay$$fayToJs(["defined",[["double"]]],_obj.timeout);
  if (undefined !== obj_timeout) {
    obj_['timeout'] = obj_timeout;
  }
  var obj_type$39$ = Fay$$fayToJs(["defined",[["user","Text",[]]]],_obj.type$39$);
  if (undefined !== obj_type$39$) {
    obj_['type$39$'] = obj_type$39$;
  }
  var obj_url = Fay$$fayToJs(["defined",[["user","Text",[]]]],_obj.url);
  if (undefined !== obj_url) {
    obj_['url'] = obj_url;
  }
  var obj_username = Fay$$fayToJs(["defined",[["user","Text",[]]]],_obj.username);
  if (undefined !== obj_username) {
    obj_['username'] = obj_username;
  }
  return obj_;
},"Show": function(type,argTypes,_obj){
  var obj_ = {"instance": "Show"};
  return obj_;
},"Hide": function(type,argTypes,_obj){
  var obj_ = {"instance": "Hide"};
  return obj_;
},"Toggle": function(type,argTypes,_obj){
  var obj_ = {"instance": "Toggle"};
  return obj_;
},"FadeIn": function(type,argTypes,_obj){
  var obj_ = {"instance": "FadeIn"};
  return obj_;
},"FadeOut": function(type,argTypes,_obj){
  var obj_ = {"instance": "FadeOut"};
  return obj_;
},"FadeToggle": function(type,argTypes,_obj){
  var obj_ = {"instance": "FadeToggle"};
  return obj_;
},"Instantly": function(type,argTypes,_obj){
  var obj_ = {"instance": "Instantly"};
  return obj_;
},"Slow": function(type,argTypes,_obj){
  var obj_ = {"instance": "Slow"};
  return obj_;
},"Fast": function(type,argTypes,_obj){
  var obj_ = {"instance": "Fast"};
  return obj_;
},"Speed": function(type,argTypes,_obj){
  var obj_ = {"instance": "Speed"};
  var obj_slot1 = Fay$$fayToJs_double(_obj.slot1);
  if (undefined !== obj_slot1) {
    obj_['slot1'] = obj_slot1;
  }
  return obj_;
},"Animation": function(type,argTypes,_obj){
  var obj_ = {"instance": "Animation"};
  var obj__type = Fay$$fayToJs(["user","AnimationType",[]],_obj._type);
  if (undefined !== obj__type) {
    obj_['_type'] = obj__type;
  }
  var obj__speed = Fay$$fayToJs(["user","Speed",[]],_obj._speed);
  if (undefined !== obj__speed) {
    obj_['_speed'] = obj__speed;
  }
  var obj__nextAnimation = Fay$$fayToJs(["user","Maybe",[["user","Animation",[]]]],_obj._nextAnimation);
  if (undefined !== obj__nextAnimation) {
    obj_['_nextAnimation'] = obj__nextAnimation;
  }
  var obj__element = Fay$$fayToJs(["user","JQuery",[]],_obj._element);
  if (undefined !== obj__element) {
    obj_['_element'] = obj__element;
  }
  return obj_;
},"WithoutDataAndEvents": function(type,argTypes,_obj){
  var obj_ = {"instance": "WithoutDataAndEvents"};
  return obj_;
},"WithDataAndEvents": function(type,argTypes,_obj){
  var obj_ = {"instance": "WithDataAndEvents"};
  return obj_;
},"DeepWithDataAndEvents": function(type,argTypes,_obj){
  var obj_ = {"instance": "DeepWithDataAndEvents"};
  return obj_;
},"KeyUp": function(type,argTypes,_obj){
  var obj_ = {"instance": "KeyUp"};
  return obj_;
},"KeyDown": function(type,argTypes,_obj){
  var obj_ = {"instance": "KeyDown"};
  return obj_;
},"KeyLeft": function(type,argTypes,_obj){
  var obj_ = {"instance": "KeyLeft"};
  return obj_;
},"KeyRight": function(type,argTypes,_obj){
  var obj_ = {"instance": "KeyRight"};
  return obj_;
},"KeyRet": function(type,argTypes,_obj){
  var obj_ = {"instance": "KeyRet"};
  return obj_;
},"SomeKey": function(type,argTypes,_obj){
  var obj_ = {"instance": "SomeKey"};
  var obj_slot1 = Fay$$fayToJs_double(_obj.slot1);
  if (undefined !== obj_slot1) {
    obj_['slot1'] = obj_slot1;
  }
  return obj_;
}});
Fay$$objConcat(Fay$$jsToFayHash,{"AjaxSettings": function(type,argTypes,obj){
  return new JQuery._AjaxSettings(Fay$$jsToFay(["defined",[["user","Text",[]]]],obj["accepts"]),Fay$$jsToFay(["defined",[["bool"]]],obj["async"]),Fay$$jsToFay(["defined",[["function",[["user","JQXHR",[]],["user","AjaxSettings",[argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],argTypes && (argTypes)[1] ? (argTypes)[1] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"]]],["action",[argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"]]]]]]],obj["beforeSend"]),Fay$$jsToFay(["defined",[["bool"]]],obj["cache"]),Fay$$jsToFay(["defined",[["function",[["user","JQXHR",[]],["user","Text",[]],["action",[argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"]]]]]]],obj["complete"]),Fay$$jsToFay(["defined",[["user","Text",[]]]],obj["contentType"]),Fay$$jsToFay(["defined",[["bool"]]],obj["crossDomain"]),Fay$$jsToFay(["defined",[argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"]]],obj["data'"]),Fay$$jsToFay(["defined",[["user","Text",[]]]],obj["dataType"]),Fay$$jsToFay(["defined",[["function",[["user","JQXHR",[]],["user","Maybe",[["user","Text",[]]]],["user","Maybe",[["user","Text",[]]]],["action",[argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"]]]]]]],obj["error'"]),Fay$$jsToFay(["defined",[["bool"]]],obj["global"]),Fay$$jsToFay(["defined",[["bool"]]],obj["ifModified"]),Fay$$jsToFay(["defined",[["bool"]]],obj["isLocal"]),Fay$$jsToFay(["defined",[["user","Text",[]]]],obj["mimeType"]),Fay$$jsToFay(["defined",[["user","Text",[]]]],obj["password"]),Fay$$jsToFay(["defined",[["bool"]]],obj["processData"]),Fay$$jsToFay(["defined",[["function",[argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],["action",[argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"]]]]]]],obj["success"]),Fay$$jsToFay(["defined",[["double"]]],obj["timeout"]),Fay$$jsToFay(["defined",[["user","Text",[]]]],obj["type'"]),Fay$$jsToFay(["defined",[["user","Text",[]]]],obj["url"]),Fay$$jsToFay(["defined",[["user","Text",[]]]],obj["username"]));
},"Show": function(type,argTypes,obj){
  return new JQuery._Show();
},"Hide": function(type,argTypes,obj){
  return new JQuery._Hide();
},"Toggle": function(type,argTypes,obj){
  return new JQuery._Toggle();
},"FadeIn": function(type,argTypes,obj){
  return new JQuery._FadeIn();
},"FadeOut": function(type,argTypes,obj){
  return new JQuery._FadeOut();
},"FadeToggle": function(type,argTypes,obj){
  return new JQuery._FadeToggle();
},"Instantly": function(type,argTypes,obj){
  return new JQuery._Instantly();
},"Slow": function(type,argTypes,obj){
  return new JQuery._Slow();
},"Fast": function(type,argTypes,obj){
  return new JQuery._Fast();
},"Speed": function(type,argTypes,obj){
  return new JQuery._Speed(Fay$$jsToFay_double(obj["slot1"]));
},"Animation": function(type,argTypes,obj){
  return new JQuery._Animation(Fay$$jsToFay(["user","AnimationType",[]],obj["_type"]),Fay$$jsToFay(["user","Speed",[]],obj["_speed"]),Fay$$jsToFay(["user","Maybe",[["user","Animation",[]]]],obj["_nextAnimation"]),Fay$$jsToFay(["user","JQuery",[]],obj["_element"]));
},"WithoutDataAndEvents": function(type,argTypes,obj){
  return new JQuery._WithoutDataAndEvents();
},"WithDataAndEvents": function(type,argTypes,obj){
  return new JQuery._WithDataAndEvents();
},"DeepWithDataAndEvents": function(type,argTypes,obj){
  return new JQuery._DeepWithDataAndEvents();
},"KeyUp": function(type,argTypes,obj){
  return new JQuery._KeyUp();
},"KeyDown": function(type,argTypes,obj){
  return new JQuery._KeyDown();
},"KeyLeft": function(type,argTypes,obj){
  return new JQuery._KeyLeft();
},"KeyRight": function(type,argTypes,obj){
  return new JQuery._KeyRight();
},"KeyRet": function(type,argTypes,obj){
  return new JQuery._KeyRet();
},"SomeKey": function(type,argTypes,obj){
  return new JQuery._SomeKey(Fay$$jsToFay_double(obj["slot1"]));
}});
var Translit = {};
Translit.Hangeul = {};
Translit.Hangeul.translitFromBlock = function($p1){
  return new Fay$$$(function(){
    var syllable = $p1;
    return (function(){
      var aux = function($p1){
        return function($p2){
          return new Fay$$$(function(){
            var index = $p2;
            var coll = $p1;
            return Fay$$_(Fay$$_(Translit.Hangeul.$60$$36$$62$)(function($p1){
              var c = $p1;
              return Fay$$_(Fay$$_(Fay$$_(Fay$$eq)(c))("_")) ? "" : c;
            }))(Fay$$_(Fay$$_(Translit.Hangeul.lookI)(index))(coll));
          });
        };
      };
      return (function(){
        return new Fay$$$(function(){
          var code = new Fay$$$(function(){
            return Fay$$_(Fay$$_(Fay$$sub)(Fay$$_(Fay$$_(Translit.Hangeul.charCodeAt)(0))(syllable)))(44032);
          });
          var initialIndex = new Fay$$$(function(){
            return Fay$$_(Fay$$_(Prelude.div)(code))(588);
          });
          var code$39$ = new Fay$$$(function(){
            return Fay$$_(Fay$$_(Fay$$sub)(code))(Fay$$_(Fay$$_(Fay$$mult)(initialIndex))(588));
          });
          var vowelIndex = new Fay$$$(function(){
            return Fay$$_(Fay$$_(Prelude.div)(code$39$))(28);
          });
          var finalIndex = new Fay$$$(function(){
            return Fay$$_(Fay$$_(Fay$$sub)(code$39$))(Fay$$_(Fay$$_(Fay$$mult)(vowelIndex))(28));
          });
          return Fay$$_(Fay$$_(Translit.Hangeul.$60$$43$$62$)(Fay$$_(Fay$$_(aux)(Translit.Hangeul.initial))(initialIndex)))(Fay$$_(Fay$$_(Translit.Hangeul.$60$$43$$62$)(Fay$$_(Fay$$_(aux)(Translit.Hangeul.vowel))(vowelIndex)))(Fay$$_(Fay$$_(aux)(Translit.Hangeul.$_final))(finalIndex)));
        });
      })();
    })();
  });
};
Translit.Hangeul.translitFromBlocks = new Fay$$$(function(){
  return Fay$$_(Fay$$_(Prelude.$46$)(Fay$$_(Fay$$_(Fay$$_(Translit.Hangeul.replace)("   "))("  "))("g")))(Fay$$_(Fay$$_(Prelude.$46$)(Fay$$_(Translit.Hangeul.join)(" ")))(Fay$$_(Fay$$_(Prelude.$46$)(Translit.Hangeul.fromMaybes))(Fay$$_(Fay$$_(Prelude.$46$)(Fay$$_(Prelude.map)(function($p1){
    var v = $p1;
    return Fay$$_(Fay$$_(Fay$$_(Fay$$eq)(v))(" ")) ? Fay$$_(Prelude.Just)(v) : Fay$$_(Translit.Hangeul.translitFromBlock)(v);
  })))(Fay$$_(Translit.Hangeul.split)("")))));
});
Translit.Hangeul.jamoFromChar = function($p1){
  return new Fay$$$(function(){
    var c = $p1;
    return Fay$$_(Fay$$_(Translit.Hangeul.$60$$36$$62$)(Translit.Hangeul.fromCharCode))(Fay$$_(Fay$$_(Translit.Hangeul.lookT)(c))(Translit.Hangeul.single));
  });
};
Translit.Hangeul.blockCode = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        var c = $p3;
        var b = $p2;
        var a = $p1;
        return Fay$$_(Fay$$_(Fay$$add)(Fay$$_(Fay$$_(Fay$$add)(Fay$$_(Fay$$_(Fay$$add)(44032))(Fay$$_(Fay$$_(Fay$$mult)(588))(a))))(Fay$$_(Fay$$_(Fay$$mult)(28))(b))))(c);
      });
    };
  };
};
Translit.Hangeul.blockFromTranslit = function($p1){
  return new Fay$$$(function(){
    var syllable = $p1;
    return (function(){
      var aux = function($p1){
        return new Fay$$$(function(){
          var x = $p1;
          return Fay$$_(Fay$$_(Prelude.$46$)(Fay$$_(Translit.Hangeul.fromMaybe)(0)))(Fay$$_(Translit.Hangeul.lookT)(Fay$$_(Fay$$_(Fay$$_(Fay$$eq)(x))("")) ? "_" : x));
        });
      };
      return (function($tmp1){
        if (Fay$$_($tmp1) instanceof Fay.FFI._Null) {
          return Prelude.Nothing;
        }
        if (Fay$$_($tmp1) instanceof Fay.FFI._Nullable) {
          if (Fay$$listLen(Fay$$_(Fay$$_($tmp1).slot1),4)) {
            if (Fay$$_(Fay$$index(1,Fay$$_(Fay$$_($tmp1).slot1))) === "") {
              if (Fay$$_(Fay$$index(2,Fay$$_(Fay$$_($tmp1).slot1))) === "") {
                if (Fay$$_(Fay$$index(3,Fay$$_(Fay$$_($tmp1).slot1))) === "") {
                  return Prelude.Nothing;
                }
              }
            }
            var a = Fay$$index(1,Fay$$_(Fay$$_($tmp1).slot1));
            var b = Fay$$index(2,Fay$$_(Fay$$_($tmp1).slot1));
            var c = Fay$$index(3,Fay$$_(Fay$$_($tmp1).slot1));
            return Fay$$_(Fay$$_(Prelude.$36$)(Fay$$_(Fay$$_(Prelude.$46$)(Prelude.Just))(Translit.Hangeul.fromCharCode)))(Fay$$_(Fay$$_(Fay$$_(Translit.Hangeul.blockCode)(Fay$$_(Fay$$_(aux)(a))(Translit.Hangeul.initial)))(Fay$$_(Fay$$_(aux)(b))(Translit.Hangeul.vowel)))(Fay$$_(Fay$$_(aux)(c))(Translit.Hangeul.$_final)));
          }
        }
        return (function(){ throw (["unhandled case",$tmp1]); })();
      })(Fay$$_(Fay$$_(Fay$$_(Translit.Hangeul.match)("^([bcdghjklmnprst]*)([aeiouyw]*)([bcdghjklmnprst]*)$"))("i"))(syllable));
    })();
  });
};
Translit.Hangeul.blocksFromTranslit = new Fay$$$(function(){
  return Fay$$_(Fay$$_(Prelude.$46$)(Fay$$_(Translit.Hangeul.join)("")))(Fay$$_(Fay$$_(Prelude.$46$)(Fay$$_(Translit.Hangeul.mapMaybe)(function($p1){
    var c = $p1;
    return Fay$$_(Fay$$_(Fay$$_(Fay$$eq)(c))("")) ? Fay$$_(Prelude.Just)(" ") : Fay$$_(Fay$$_(Translit.Hangeul.$60$$36$$62$)(function($p1){
      var $gen_0 = $p1;
      return Fay$$_(Fay$$_(Fay.Text.cons)($gen_0))("");
    }))(Fay$$_(Translit.Hangeul.blockFromTranslit)(c));
  })))(Fay$$_(Translit.Hangeul.split)(" ")));
});
Translit.Hangeul.$60$$36$$62$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) instanceof Prelude._Nothing) {
        return Prelude.Nothing;
      }
      if (Fay$$_($p2) instanceof Prelude._Just) {
        var x = Fay$$_($p2).slot1;
        var f = $p1;
        return Fay$$_(Fay$$_(Prelude.$36$)(Prelude.Just))(Fay$$_(f)(x));
      }
      throw ["unhandled case in (\u003c$\u003e)",[$p1,$p2]];
    });
  };
};
Translit.Hangeul.$60$$42$$62$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) instanceof Prelude._Just) {
        var m = Fay$$_($p2).slot1;
        if (Fay$$_($p1) instanceof Prelude._Just) {
          var f = Fay$$_($p1).slot1;
          return Fay$$_(Fay$$_(Prelude.$36$)(Prelude.Just))(Fay$$_(f)(m));
        }
      }
      return Prelude.Nothing;
    });
  };
};
Translit.Hangeul.fromMaybe = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) instanceof Prelude._Just) {
        var a = Fay$$_($p2).slot1;
        return a;
      }
      if (Fay$$_($p2) instanceof Prelude._Nothing) {
        var a = $p1;
        return a;
      }
      throw ["unhandled case in fromMaybe",[$p1,$p2]];
    });
  };
};
Translit.Hangeul.fromCharCode = function($p1){
  return new Fay$$$(function(){
    return Fay$$jsToFay(["user","Char",[]],String.fromCharCode(Fay$$fayToJs_int($p1)));
  });
};
Translit.Hangeul.charCodeAt = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay_int(Fay$$fayToJs(["user","Text",[]],$p2).charCodeAt(Fay$$fayToJs_int($p1)));
    });
  };
};
Translit.Hangeul.replace = function($p1){
  return function($p2){
    return function($p3){
      return function($p4){
        return new Fay$$$(function(){
          return Fay$$jsToFay(["user","Text",[]],Fay$$fayToJs(["user","Text",[]],$p4).replace(Fay$$fayToJs(["user","Text",[]],$p1),Fay$$fayToJs(["user","Text",[]],$p2),Fay$$fayToJs(["user","Text",[]],$p3)));
        });
      };
    };
  };
};
Translit.Hangeul.split = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay(["list",[["user","Text",[]]]],Fay$$fayToJs(["user","Text",[]],$p2).split(Fay$$fayToJs(["user","Text",[]],$p1)));
    });
  };
};
Translit.Hangeul.match = function($p1){
  return function($p2){
    return function($p3){
      return new Fay$$$(function(){
        return Fay$$jsToFay(["nullable",[["list",[["user","Text",[]]]]]],Fay$$fayToJs(["user","Text",[]],$p3).match(Fay$$fayToJs(["user","Text",[]],$p1),Fay$$fayToJs(["user","Text",[]],$p2)));
      });
    };
  };
};
Translit.Hangeul.fst3 = function($p1){
  return new Fay$$$(function(){
    if (Fay$$listLen(Fay$$_($p1),3)) {
      var a = Fay$$index(0,Fay$$_($p1));
      return a;
    }
    throw ["unhandled case in fst3",[$p1]];
  });
};
Translit.Hangeul.snd3 = function($p1){
  return new Fay$$$(function(){
    if (Fay$$listLen(Fay$$_($p1),3)) {
      var b = Fay$$index(1,Fay$$_($p1));
      return b;
    }
    throw ["unhandled case in snd3",[$p1]];
  });
};
Translit.Hangeul.join = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      return Fay$$jsToFay(["user","Text",[]],Fay$$fayToJs(["list",[["user","Text",[]]]],$p2).join(Fay$$fayToJs(["user","Text",[]],$p1)));
    });
  };
};
Translit.Hangeul.mapMaybe = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      if (Fay$$_($p2) === null) {
        return null;
      }
      var $tmp1 = Fay$$_($p2);
      if ($tmp1 instanceof Fay$$Cons) {
        var x = $tmp1.car;
        var xs = $tmp1.cdr;
        var f = $p1;
        return (function(){
          return new Fay$$$(function(){
            var rs = new Fay$$$(function(){
              return Fay$$_(Fay$$_(Translit.Hangeul.mapMaybe)(f))(xs);
            });
            return (function($tmp1){
              if (Fay$$_($tmp1) instanceof Prelude._Nothing) {
                return rs;
              }
              if (Fay$$_($tmp1) instanceof Prelude._Just) {
                var r = Fay$$_($tmp1).slot1;
                return Fay$$_(Fay$$_(Fay$$cons)(r))(rs);
              }
              return (function(){ throw (["unhandled case",$tmp1]); })();
            })(Fay$$_(f)(x));
          });
        })();
      }
      throw ["unhandled case in mapMaybe",[$p1,$p2]];
    });
  };
};
Translit.Hangeul.fromNullable = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) instanceof Fay.FFI._Null) {
      return Prelude.Nothing;
    }
    if (Fay$$_($p1) instanceof Fay.FFI._Nullable) {
      var a = Fay$$_($p1).slot1;
      return Fay$$_(Prelude.Just)(a);
    }
    throw ["unhandled case in fromNullable",[$p1]];
  });
};
Translit.Hangeul.fromMaybes = function($p1){
  return new Fay$$$(function(){
    if (Fay$$_($p1) === null) {
      return null;
    }
    var $tmp1 = Fay$$_($p1);
    if ($tmp1 instanceof Fay$$Cons) {
      var x = $tmp1.car;
      var xs = $tmp1.cdr;
      return (function($tmp1){
        if (Fay$$_($tmp1) instanceof Prelude._Just) {
          var a = Fay$$_($tmp1).slot1;
          return Fay$$_(Fay$$_(Fay$$cons)(a))(Fay$$_(Translit.Hangeul.fromMaybes)(xs));
        }
        if (Fay$$_($tmp1) instanceof Prelude._Nothing) {
          return Fay$$_(Translit.Hangeul.fromMaybes)(xs);
        }
        return (function(){ throw (["unhandled case",$tmp1]); })();
      })(x);
    }
    throw ["unhandled case in fromMaybes",[$p1]];
  });
};
Translit.Hangeul.$60$$43$$62$ = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var b = $p2;
      var a = $p1;
      return (function($tmp1){
        if (Fay$$listLen(Fay$$_($tmp1),2)) {
          if (Fay$$_(Fay$$index(0,Fay$$_($tmp1))) instanceof Prelude._Just) {
            var a$39$ = Fay$$_(Fay$$index(0,Fay$$_($tmp1))).slot1;
            if (Fay$$_(Fay$$index(1,Fay$$_($tmp1))) instanceof Prelude._Just) {
              var b$39$ = Fay$$_(Fay$$index(1,Fay$$_($tmp1))).slot1;
              return Fay$$_(Fay$$_(Prelude.$36$)(Prelude.Just))(Fay$$_(Fay$$_(Fay.Text.append)(a$39$))(b$39$));
            }
          }
          return Prelude.Nothing;
        }
        return (function(){ throw (["unhandled case",$tmp1]); })();
      })(Fay$$list([a,b]));
    });
  };
};
Translit.Hangeul.lookT = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var l = $p2;
      var k = $p1;
      return Fay$$_(Fay$$_(Translit.Hangeul.$60$$36$$62$)(Translit.Hangeul.snd3))(Fay$$_(Fay$$_(Prelude.find)(Fay$$_(Fay$$_(Prelude.$46$)(function($p1){
        var $gen_0 = $p1;
        return Fay$$_(Fay$$_(Fay$$eq)($gen_0))(k);
      }))(Translit.Hangeul.fst3)))(l));
    });
  };
};
Translit.Hangeul.lookI = function($p1){
  return function($p2){
    return new Fay$$$(function(){
      var l = $p2;
      var k = $p1;
      return Fay$$_(Fay$$_(Translit.Hangeul.$60$$36$$62$)(Translit.Hangeul.fst3))(Fay$$_(Fay$$_(Prelude.find)(Fay$$_(Fay$$_(Prelude.$46$)(function($p1){
        var $gen_0 = $p1;
        return Fay$$_(Fay$$_(Fay$$eq)($gen_0))(k);
      }))(Translit.Hangeul.snd3)))(l));
    });
  };
};
Translit.Hangeul.single = new Fay$$$(function(){
  return Fay$$list([Fay$$list(["g",12593,"ㄱ"]),Fay$$list(["gg",12594,"ㄲ"]),Fay$$list(["gl",12595,"ㄳ"]),Fay$$list(["n",12596,"ㄴ"]),Fay$$list(["lj",12597,"ㄵ"]),Fay$$list(["lh",12598,"ㄶ"]),Fay$$list(["d",12599,"ㄷ"]),Fay$$list(["dd",12600,"ㄸ"]),Fay$$list(["l",12601,"ㄹ"]),Fay$$list(["lg",12602,"ㄺ"]),Fay$$list(["lm",12603,"ㄻ"]),Fay$$list(["lb",12604,"ㄼ"]),Fay$$list(["ls",12605,"ㄽ"]),Fay$$list(["lt",12606,"ㄾ"]),Fay$$list(["lp",12607,"ㄿ"]),Fay$$list(["lh",12608,"ㅀ"]),Fay$$list(["m",12609,"ㅁ"]),Fay$$list(["b",12610,"ㅂ"]),Fay$$list(["bb",12611,"ㅃ"]),Fay$$list(["bs",12612,"ㅄ"]),Fay$$list(["s",12613,"ㅅ"]),Fay$$list(["ss",12614,"ㅆ"]),Fay$$list(["ng",12615,"ㅇ"]),Fay$$list(["j",12616,"ㅈ"]),Fay$$list(["jj",12617,"ㅉ"]),Fay$$list(["ch",12618,"ㅊ"]),Fay$$list(["k",12619,"ㅋ"]),Fay$$list(["t",12620,"ㅌ"]),Fay$$list(["p",12621,"ㅍ"]),Fay$$list(["h",12622,"ㅎ"]),Fay$$list(["a",12623,"ㅏ"]),Fay$$list(["ae",12624,"ㅐ"]),Fay$$list(["ya",12625,"ㅑ"]),Fay$$list(["yae",12626,"ㅒ"]),Fay$$list(["oe",12627,"ㅓ"]),Fay$$list(["e",12628,"ㅔ"]),Fay$$list(["yoe",12629,"ㅕ"]),Fay$$list(["ye",12630,"ㅖ"]),Fay$$list(["o",12631,"ㅗ"]),Fay$$list(["wa",12632,"ㅘ"]),Fay$$list(["wae",12633,"ㅙ"]),Fay$$list(["wi",12634,"ㅚ"]),Fay$$list(["yo",12635,"ㅛ"]),Fay$$list(["u",12636,"ㅜ"]),Fay$$list(["weo",12637,"ㅝ"]),Fay$$list(["we",12638,"ㅞ"]),Fay$$list(["wi",12639,"ㅟ"]),Fay$$list(["yu",12640,"ㅠ"]),Fay$$list(["eu",12641,"ㅡ"]),Fay$$list(["yi",12642,"ㅢ"]),Fay$$list(["i",12643,"ㅣ"]),Fay$$list(["nn",12645,"ㅥ"]),Fay$$list(["nd",12646,"ㅦ"]),Fay$$list(["ns",12647,"ㅧ"]),Fay$$list(["lgs",12649,"ㅩ"]),Fay$$list(["ld",12650,"ㅪ"]),Fay$$list(["lbs",12651,"ㅫ"]),Fay$$list(["lh",12653,"ㅭ"]),Fay$$list(["mb",12654,"ㅮ"]),Fay$$list(["ms",12655,"ㅯ"]),Fay$$list(["mng",12657,"ㅱ"]),Fay$$list(["bg",12658,"ㅲ"]),Fay$$list(["bd",12659,"ㅳ"]),Fay$$list(["bsg",12660,"ㅴ"]),Fay$$list(["bsd",12661,"ㅵ"]),Fay$$list(["bj",12662,"ㅶ"]),Fay$$list(["bt",12663,"ㅷ"]),Fay$$list(["bng",12664,"ㅸ"]),Fay$$list(["bbng",12665,"ㅹ"]),Fay$$list(["bg",12666,"ㅺ"]),Fay$$list(["sn",12667,"ㅻ"]),Fay$$list(["sd",12668,"ㅼ"]),Fay$$list(["sb",12669,"ㅽ"]),Fay$$list(["sj",12670,"ㅾ"]),Fay$$list(["png",12676,"ㆄ"]),Fay$$list(["hh",12677,"ㆅ"]),Fay$$list(["yoya",12679,"ㆇ"]),Fay$$list(["yoyae",12680,"ㆈ"]),Fay$$list(["yoi",12681,"ㆉ"]),Fay$$list(["yuyeo",12682,"ㆊ"]),Fay$$list(["yuye",12683,"ㆋ"]),Fay$$list(["yui",12684,"ㆌ"])]);
});
Translit.Hangeul.initial = new Fay$$$(function(){
  return Fay$$list([Fay$$list(["g",0,"&#x1100"]),Fay$$list(["gg",1,"&#x1101"]),Fay$$list(["n",2,"&#x1102"]),Fay$$list(["d",3,"&#x1103"]),Fay$$list(["dd",4,"&#x1104"]),Fay$$list(["l",5,"&#x1105"]),Fay$$list(["m",6,"&#x1106"]),Fay$$list(["b",7,"&#x1107"]),Fay$$list(["bb",8,"&#x1108"]),Fay$$list(["s",9,"&#x1109"]),Fay$$list(["ss",10,"&#x110A"]),Fay$$list(["_",11,"&#x110B"]),Fay$$list(["j",12,"&#x110C"]),Fay$$list(["jj",13,"&#x110D"]),Fay$$list(["ch",14,"&#x110E"]),Fay$$list(["k",15,"&#x110F"]),Fay$$list(["t",16,"&#x1110"]),Fay$$list(["p",17,"&#x1111"]),Fay$$list(["h",18,"&#x1112"])]);
});
Translit.Hangeul.vowel = new Fay$$$(function(){
  return Fay$$list([Fay$$list(["a",0,"&#x1161"]),Fay$$list(["ae",1,"&#x1162"]),Fay$$list(["ya",2,"&#x1163"]),Fay$$list(["yae",3,"&#x1164"]),Fay$$list(["eo",4,"&#x1165"]),Fay$$list(["e",5,"&#x1166"]),Fay$$list(["yeo",6,"&#x1167"]),Fay$$list(["ye",7,"&#x1168"]),Fay$$list(["o",8,"&#x1169"]),Fay$$list(["wa",9,"&#x116A"]),Fay$$list(["wae",10,"&#x116B"]),Fay$$list(["oe",11,"&#x116C"]),Fay$$list(["yo",12,"&#x116D"]),Fay$$list(["u",13,"&#x116E"]),Fay$$list(["weo",14,"&#x116F"]),Fay$$list(["we",15,"&#x1170"]),Fay$$list(["wi",16,"&#x1171"]),Fay$$list(["yu",17,"&#x1172"]),Fay$$list(["eu",18,"&#x1173"]),Fay$$list(["yi",19,"&#x1174"]),Fay$$list(["i",20,"&#x1175"])]);
});
Translit.Hangeul.$_final = new Fay$$$(function(){
  return Fay$$list([Fay$$list(["_",0,""]),Fay$$list(["g",1,"&#x11A8"]),Fay$$list(["gg",2,"&#x11A9"]),Fay$$list(["gs",3,"&#x11AA"]),Fay$$list(["n",4,"&#x11AB"]),Fay$$list(["nj",5,"&#x11AC"]),Fay$$list(["nh",6,"&#x11AD"]),Fay$$list(["d",7,"&#x11AE"]),Fay$$list(["l",8,"&#x11AF"]),Fay$$list(["lg",9,"&#x11B0"]),Fay$$list(["lm",10,"&#x11B1"]),Fay$$list(["lb",11,"&#x11B2"]),Fay$$list(["ls",12,"&#x11B3"]),Fay$$list(["lt",13,"&#x11B4"]),Fay$$list(["lp",14,"&#x11B5"]),Fay$$list(["lh",15,"&#x11B6"]),Fay$$list(["m",16,"&#x11B7"]),Fay$$list(["b",17,"&#x11B8"]),Fay$$list(["bs",18,"&#x11B9"]),Fay$$list(["s",19,"&#x11BA"]),Fay$$list(["ss",20,"&#x11BB"]),Fay$$list(["ng",21,"&#x11BC"]),Fay$$list(["j",22,"&#x11BD"]),Fay$$list(["ch",23,"&#x11BE"]),Fay$$list(["k",24,"&#x11BF"]),Fay$$list(["t",25,"&#x11C0"]),Fay$$list(["p",26,"&#x11C1"]),Fay$$list(["h",27,"&#x11C2"])]);
});
var FayTetsWeb = {};
FayTetsWeb.main = new Fay$$$(function(){
  return Fay$$_(Fay$$_(Prelude.$36$)(JQuery.ready))(Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(JQuery.select)("#inp")))(function($p1){
    var inp = $p1;
    return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(JQuery.select)("#out")))(function($p1){
      var out = $p1;
      return Fay$$_(Fay$$_(Fay$$then)(Fay$$_(Fay$$_(Prelude.$36$)(function($p1){
        var $gen_0 = $p1;
        return Fay$$_(Fay$$_(JQuery.keyup)($gen_0))(inp);
      }))(function($p1){
        return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(JQuery.getVal)(inp)))(function($p1){
          var t = $p1;
          return Fay$$_(Fay$$_(Fay$$then)(Fay$$_(Fay$$_(JQuery.setVal)(Fay$$_(Translit.Hangeul.blocksFromTranslit)(t)))(out)))(Fay$$_(Fay$$$_return)(Fay$$unit));
        });
      })))(Fay$$_(Fay$$_(Prelude.$36$)(function($p1){
        var $gen_0 = $p1;
        return Fay$$_(Fay$$_(JQuery.keyup)($gen_0))(out);
      }))(function($p1){
        return Fay$$_(Fay$$_(Fay$$bind)(Fay$$_(JQuery.getVal)(out)))(function($p1){
          var b = $p1;
          return Fay$$_(Fay$$_(Fay$$then)(Fay$$_(Fay$$_(JQuery.setVal)(Fay$$_(Translit.Hangeul.translitFromBlocks)(b)))(inp)))(Fay$$_(Fay$$$_return)(Fay$$unit));
        });
      }));
    });
  }));
});

;
Fay$$_(FayTetsWeb.main);

