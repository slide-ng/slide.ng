---
title: Click preview deck
---

# Reveal

<div id="p1" slide-ng-click>one</div>
<div id="p2" slide-ng-click>two</div>
<div id="p2b" slide-ng-after>two, too</div>
<div id="ph" slide-ng-click="5" slide-ng-click-hide>gone at five</div>
<div id="pr" [slide-ng-click]="[5, 6]">only at five</div>

<slide-ng-clicks>

- item three
- item four

</slide-ng-clicks>

---

# Other kinds

```ts {1|2|all}
const a = 1;
const b = 2;
```

<slide-ng-switch>
<div at="1" id="sw1">switch one</div>
<div at="2" id="sw2">switch two</div>
</slide-ng-switch>

````md magic-move
```js
let count = 1
```

```js
let count = 2
```
````

<span id="mk" slide-ng-mark.red.circle="6">marked</span>

<div id="mo" class="w-20 h-10 bg-blue-300" slide-ng-motion :initial="{ x: 0 }" :enter="{ x: 0 }" :click-7="{ x: 40 }">moves</div>
