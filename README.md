# ParaSwap Widget

<img src="https://paraswap-achirecture.netlify.com/logo.png" width="400px" >

---

ParaSwap Widget allows you to provide the best ERC20 prices for your users and earn fees on every trade.

You can monetize by using the referrer field. Reach out to us on Telegram for more info: https://t.me/paraswap 

Here is how it looks:

<img src="https://paraswap-achirecture.netlify.com/sdk-example.gif" width="400px" >

---

### How to use ParaSwap Widget :

Install the lib using npm or yarn

```bash
yarn install paraswap-widget
```

```jsx
// include styles somewhere in your app
import 'paraswap-widget/dist/PSWidget.css'

const {PSWidget} = require("paraswap-widget");
//or
import {PSWidget} from "paraswap-widget";

<PSWidget referrer={"my_company"} providerUrl={"MY_INFURA_URL"} />
```

Those are the properties you can use to customize the widget:

```jsx
interface IPSWidgetProps {
  providerUrl: string;  //Required
  referrer: string;  //Required
  defaultSlippage: number;
  defaultPair: { from: string, to: string, amount: string };
  unlimitedAllowance: boolean;
  hasReceiver: boolean;
  bgColor: string;
  fixedFrom: boolean,
  fixedTo: boolean,
}
```

You can also customize it a bit more

```jsx
<PSWidget 
  referrer={"my_company"} 
  providerUrl={"MY_INFURA_URL"}
  unlimitedAllowance={false} 
  bgColor={"#DDD"} 
  defaultPair={{from: 'cDAI', to: 'aDAI', amount: '100'}} 
/>
```

If you wan to fix the from and/or to token, you can use fixedFrom and fixedTo params

```jsx
<PSWidget 
  referrer={"my_company"} 
  providerUrl={"MY_INFURA_URL"}
  defaultPair={{from: 'cDAI', to: 'JRT', amount: '100'}} 
  fixedFrom={true}
  fixedTo={true}
/>
```

And you're good to go :) 
