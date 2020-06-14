import * as React from 'react';
import * as _ from 'lodash';
import BN from "bignumber.js";
import {Button, Dropdown, Form, Label, Icon, Input, Message, Image} from "semantic-ui-react";
import {Address, APIError, NetworkID, OptimalRates, ParaSwap, Token, User} from "paraswap";

const Web3 = require('web3');

import 'semantic-ui-css/semantic.min.css';

import './PSWidget.scss';

import {UNLIMITED_ALLOWANCE} from "paraswap";

declare let window: any;
declare let localStorage: any;

const DEFAULT_ALLOWED_SLIPPAGE = 0.01;//1%

const DEFAULT_PAIR = {from: 'ETH', to: 'DAI', amount: '1'};

interface IPSWidgetProps {
  providerUrl: string;
  referrer: string;
  defaultSlippage: number;
  defaultPair: { from: string, to: string, amount: string };
  unlimitedAllowance: boolean;
  bgColor: string;
}

interface IPSWidgetState {
  error: string | React.ReactElement,
  status: string,
  loading: boolean,
  tokens: Token[],
  srcAmount: string,
  receiver: Address,
  transactionHash: string,
  tokenFrom?: Token,
  tokenTo?: Token,
  user?: User,
  priceRoute?: OptimalRates
}

export class PSWidget extends React.Component<IPSWidgetProps, IPSWidgetState> {
  paraswap: ParaSwap;
  provider: any;
  onAmountChangeEvt: any;

  public static defaultProps = {
    defaultSlippage: DEFAULT_ALLOWED_SLIPPAGE,
    defaultPair: DEFAULT_PAIR,
    unlimitedAllowance: true,
    bgColor: 'black'
  };

  constructor(props: IPSWidgetProps) {
    super(props);

    this.paraswap = new ParaSwap();

    this.provider = new Web3(props.providerUrl);

    this.onAmountChangeEvt = {
      srcAmount: _.debounce((value) => this.setSrcAmount(value), 500),
    };

    this.state = {
      error: '',
      status: '',
      loading: true,
      tokens: [],
      srcAmount: this.props.defaultPair.amount,
      receiver: '',
      transactionHash: '',
    };
  }

  async getTokens(): Promise<void> {
    try {
      const {defaultPair} = this.props;

      const tokensOrError: Token[] | APIError = await this.paraswap.getTokens();

      if (!tokensOrError || (tokensOrError as APIError).message) {
        return this.getTokens();
      }

      const tokens = tokensOrError as Token[];

      this.setState({tokens});

      const tokenFrom = tokens.find((t: any) => t.symbol === defaultPair.from);
      const tokenTo = tokens.find((t: any) => t.symbol === defaultPair.to);

      this.setState({tokens, tokenFrom, tokenTo, loading: false}, () => this.getBestPrice(this.state.srcAmount));

    } catch (e) {
      console.error('Error', e);
      this.getTokens();
    }
  }

  async onGetRates(srcAmount: string) {
    const {user} = this.state;

    this.getBestPrice(srcAmount);

    if (!user) {
      await this.connectUser();
    }
  }

  async getBestPrice(srcAmount: string) {
    try {
      this.setState({status: ''});

      const {tokenFrom, tokenTo} = this.state;

      if (new BN(srcAmount).isNaN() || new BN(srcAmount).isLessThanOrEqualTo(0) || !tokenFrom || !tokenTo) {
        return;
      }

      this.setState({error: '', loading: true, priceRoute: undefined});

      const _srcAmount = new BN(srcAmount).times(10 ** tokenFrom.decimals);

      if (_srcAmount.isNaN() || _srcAmount.isLessThanOrEqualTo(0)) {
        return;
      }

      this.setState({loading: true});

      const priceRouteOrError: any = await this.paraswap.getRate(tokenFrom.address, tokenTo.address, _srcAmount.toFixed(0));

      if (priceRouteOrError.message) {
        return this.setState({error: priceRouteOrError.message, loading: false});
      }

      const priceRoute = priceRouteOrError;

      this.setState({loading: false, priceRoute});

    } catch (e) {
      this.setState({error: "Price Feed Error", loading: false});
    }
  }

  updatePair(fromOrTo: string, symbol: string) {
    if (fromOrTo === 'from') {
      if (this.state.tokenTo && symbol === this.state.tokenTo.symbol) {
        this.switch();
      }

      const tokenFrom = this.state.tokens.find((t: any) => t.symbol === symbol);

      this.setState(
        {tokenFrom, priceRoute: undefined},
        () => this.getBestPrice(this.state.srcAmount)
      );

    } else {
      if (this.state.tokenFrom && symbol === this.state.tokenFrom.symbol) {
        this.switch();
      }

      this.setState(
        {priceRoute: undefined, tokenTo: this.state.tokens.find((t: any) => t.symbol === symbol)},
        () => this.getBestPrice(this.state.srcAmount)
      );
    }
  }

  isValidAddress(address: string) {
    return this.provider.utils.isAddress(address);
  }

  onReceiverToChanged(e: any) {
    const receiver = e.target.value;
    this.setState({receiver});

    if (receiver && !this.isValidAddress(receiver)) {
      this.setState({error: 'Invalid Receiver address'});
    } else {
      this.setState({error: ''});
    }
  };

  getDestAmount() {
    const {priceRoute, tokenTo} = this.state;

    if (!priceRoute || !tokenTo) {
      return '';
    }

    const destAmount = new BN(priceRoute.amount).dividedBy(10 ** tokenTo.decimals);

    if (destAmount.isNaN()) {
      return '';
    }

    return destAmount.toFixed();
  }

  getSrcAmount(value: string) {
    if (_.isNaN(Number(value))) {
      return this.state.srcAmount;
    }
    return value;
  }

  setSrcAmount(value: string) {
    const srcAmount = this.getSrcAmount(value);

    this.setState(
      {srcAmount, priceRoute: undefined},
      () => this.getBestPrice(srcAmount)
    );
  }

  onAmountChange(srcOrDestAmount: string, value: string) {
    const amount = Number(value);
    if (_.isNaN(amount) || amount < 0) return;

    if (srcOrDestAmount === 'srcAmount') {
      this.setState({loading: true, srcAmount: this.getSrcAmount(value)});
      this.onAmountChangeEvt.srcAmount(value);
    }
  }

  switch() {
    const {tokenFrom, tokenTo} = this.state;
    this.setState({tokenFrom: tokenTo, tokenTo: tokenFrom});
  };

  currentProvider() {
    return (window.ethereum) || (window.web3 && window.web3.currentProvider);
  }

  saveUser(user: any) {
    if (localStorage) {
      localStorage.setItem("user", user.address);
    }
  }

  loadUser() {
    if (localStorage) {
      const userAddress = localStorage.getItem("user");

      if (userAddress) {
        this.connectUser();
      }
    }
  }

  async connectUser(): Promise<User | APIError> {
    try {
      const web3 = this.currentProvider();

      const addresses = await web3.enable();

      const userTokens = await this.paraswap.getBalances(addresses[0]);

      if ((userTokens as APIError).message) {
        return {message: "Error Getting Balances"}
      }

      const user = new User(addresses[0], Number(web3.networkVersion) as NetworkID, userTokens as Token[]);

      this.provider = new Web3(web3);

      this.setState({user});

      this.saveUser(user);

      return user;
    } catch (e) {
      return {message: e.message};
    }
  }

  async checkApprove(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      return setTimeout(async () => {
        try {
          const {tokenFrom, user, srcAmount} = this.state;

          const allowance = await this.paraswap.getAllowance(user!.address, tokenFrom!.address);

          if (new BN(allowance).isGreaterThanOrEqualTo(new BN(srcAmount).times(10 ** tokenFrom!.decimals))) {
            this.setState({status: 'Token approved...'});
            return resolve();
          }

          return this.checkApprove();
        } catch (e) {
          console.error('Error', e);
          this.setState({error: e.message});
          reject();
        }
      }, 15 * 1000);
    })
  }

  async checkBalances() {
    try {
      const {unlimitedAllowance} = this.props;
      const {tokenFrom, srcAmount, user} = this.state;

      this.setState({status: 'Checking Balances...'});

      const enoughBalance = (balance: any, amount: any) => new BN(balance).isGreaterThanOrEqualTo(amount);
      const enoughAllowance = (allowance: any, amount: any) => new BN(allowance).isGreaterThanOrEqualTo(amount);

      const {balance, allowance} = (user!.tokens || []).find((t: any) => t.symbol === tokenFrom!.symbol) || {};

      const _srcAmount = new BN(srcAmount).times(10 ** tokenFrom!.decimals).toFixed(0);

      if (!enoughBalance(balance, _srcAmount)) {
        this.setState({error: 'Not enough Balance...'});
        return false;
      }

      if (tokenFrom!.symbol !== 'ETH') {
        if (!enoughAllowance(allowance, _srcAmount)) {
          this.setState({status: 'Please unlock the Token...'});

          this.paraswap.setWeb3Provider(this.provider);

          const allowance = unlimitedAllowance ? UNLIMITED_ALLOWANCE : _srcAmount;

          const transactionHash = await this.paraswap.approveToken(allowance, user!.address, tokenFrom!.address);

          this.setState({status: 'Unlocking the Token...'});

          this.setState({transactionHash});

          await this.checkApprove();

          return true;
        }
      }

      return true;
    } catch (e) {
      console.error('error checkBalances', e);
      this.setState({error: new Error(e).message});
    }

    return false;
  }

  async swap() {
    try {
      const {referrer, defaultSlippage} = this.props;

      const {tokenFrom, tokenTo, srcAmount, priceRoute, receiver} = this.state;

      if (!priceRoute) {
        return this.setState({error: "Price Error. Please refresh the rates"});
      }

      this.setState({error: '', status: 'Connecting..'});

      const web3 = this.currentProvider();

      if (typeof web3 === 'undefined') {
        return this.setState({
          error: (
            <label>
              Please Install Metamask <a target={"_blank"} href={"https://metamask.io"}>metamask.io</a>
            </label>
          )
        });
      }

      const userOrError = await this.connectUser();

      if ((userOrError as APIError).message) {
        return this.setState({error: (userOrError as APIError).message, loading: false});
      }

      const user = userOrError as User;

      if (!(await this.checkBalances())) {
        return;
      }

      this.setState({loading: true, error: ''});

      const _srcAmount = new BN(srcAmount).times(10 ** tokenFrom!.decimals).toFixed(0);

      const minDestinationAmount = new BN(priceRoute.amount).multipliedBy(1 - defaultSlippage).toFixed(0);

      this.setState({status: 'Building the transaction...'});

      const txParams: any = await this.paraswap.buildTx(
        tokenFrom!.address, tokenTo!.address, _srcAmount, minDestinationAmount, priceRoute, user.address, referrer, receiver
      );

      if (txParams.message) {
        return this.setState({error: txParams.message, loading: false});
      }

      this.setState({status: 'Please sign the transaction...'});

      await this.provider.eth.sendTransaction(txParams, async (err: any, transactionHash: any) => {
        if (err) {
          return this.setState({error: err.toString(), loading: false});
        }

        this.setState({status: ''});

        this.setState({transactionHash});
      });

    } catch (e) {
      this.setState({error: e.message});
    }

    this.setState({loading: false, status: ''});
  }

  isOutOfBalance() {
    const {tokenFrom, srcAmount, user} = this.state;

    if (!user) {
      return false;
    }

    const token = (user.tokens || []).find((t: any) => t.symbol === tokenFrom!.symbol);

    return !!token && new BN(token.balance || '0').dividedBy(10 ** tokenFrom!.decimals).isLessThan(srcAmount);
  }

  getBalance(fromOrTo: any) {
    const {tokenFrom, tokenTo, user} = this.state;

    if (!(user && user.tokens && user.tokens.length)) {
      return null;
    }

    const selectedToken = fromOrTo === 'from' ? tokenFrom : tokenTo;

    const token = selectedToken && user.tokens.find((t: any) => t.symbol === selectedToken.symbol);

    const balance = token ? token.balance && new BN(token.balance).dividedBy(10 ** token.decimals).toFixed(4) : 0;

    const outOfBalance = (fromOrTo === 'from') ? this.isOutOfBalance() : false;

    return <Label className={`balance outOfBalance-${outOfBalance}`}>{balance}</Label>;
  }

  componentDidMount() {
    this.getTokens();

    this.loadUser();
  }

  render() {
    const {tokens, srcAmount, tokenFrom, tokenTo, loading, priceRoute, receiver, error, status, transactionHash} = this.state;

    const options = tokens.map((t: any) => ({
      key: t.symbol,
      text: t.symbol,
      value: t.symbol,
      image: {avatar: true, src: t.img}
    }));

    const {bgColor} = this.props;

    return (
      <div className={"ps-widget"} style={{backgroundColor: bgColor}}>
        <Image src="https://paraswap-images.s3-eu-west-1.amazonaws.com/logo.png"/>

        {
          error ? (
            <Message negative icon>
              <Icon name='exclamation'/>
              <Message.Content>
                <Message.Content>{error}</Message.Content>
              </Message.Content>
            </Message>
          ) : null
        }

        {
          (!error && status) ? (
            <Message info>
              <Message.Header>
                {status}
              </Message.Header>
            </Message>
          ) : null
        }

        {
          transactionHash ? (
            <Message info>
              <a target={'_blank'} href={`https://etherscan.io/tx/${transactionHash}`}>Track transaction</a>
            </Message>
          ) : null
        }

        <Form>
          <Form.Field>
            <Input
              autoFocus
              placeholder='Send'
              onChange={(e: any) => this.onAmountChange('srcAmount', e.target.value)}
              value={srcAmount.toString()}
            />
          </Form.Field>

          <Form.Field>
            <Dropdown
              placeholder='From'
              search
              fluid
              selection
              options={options}
              value={tokenFrom && tokenFrom.symbol}
              onChange={(_, data: any) => this.updatePair('from', data.value)}
            />
            {this.getBalance('from')}
          </Form.Field>

          <Form.Field>
            <Dropdown
              placeholder='To'
              search
              fluid
              selection
              options={options}
              value={tokenTo && tokenTo.symbol}
              onChange={(_, data: any) => this.updatePair('to', data.value)}
            />
            {this.getBalance('to')}
          </Form.Field>

          <Form.Field>
            <Input
              value={this.getDestAmount()}
              placeholder='Receive'
              loading={loading}
            />
          </Form.Field>

          <Form.Field>
            <Input
              className={'pay-to'}
              placeholder='Send to'
              value={receiver}
              onChange={e => this.onReceiverToChanged(e)}
            />
          </Form.Field>

          <Form.Field>
            <Button
              loading={loading}
              primary fluid
              onClick={() => this.onGetRates(srcAmount)}
              className={"getRates"}
            >
              GET RATES
            </Button>
          </Form.Field>

          <Form.Field>
            <Button
              positive
              primary fluid
              disabled={loading || !priceRoute || this.isOutOfBalance()}
              onClick={() => this.swap()}
              className={"swap"}
            >
              SWAP
            </Button>
          </Form.Field>
        </Form>
      </div>
    );
  }
}
