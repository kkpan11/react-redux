/*eslint-disable react/prop-types*/

import * as rtl from '@testing-library/react'
import React from 'react'
import { Provider as ProviderMock, connect } from 'react-redux'
import type { AnyAction } from 'redux'
import { createStore } from 'redux'

const IS_REACT_18 = React.version.startsWith('18')

describe('React', () => {
  describe('connect', () => {
    it('should render on useEffect hook state update', () => {
      interface RootStateType {
        byId: {
          [x: string]: string
        }
        list: Array<number>
      }
      const store = createStore<RootStateType, AnyAction, {}, {}>(
        (state, action) => {
          let newState =
            state !== undefined
              ? state
              : {
                  byId: {},
                  list: [],
                }
          switch (action.type) {
            case 'FOO':
              newState = {
                ...newState,
                list: [1],
                byId: { 1: 'foo' },
              }
              break
          }
          return newState
        },
      )

      const mapStateSpy1 = vi.fn()
      const renderSpy1 = vi.fn()

      let component1StateList: number[]

      const component1Decorator = connect<
        Omit<RootStateType, 'byId'>,
        unknown,
        unknown,
        RootStateType
      >((state) => {
        mapStateSpy1()

        return {
          list: state.list,
        }
      })

      const component1 = (props: Omit<RootStateType, 'byId'>) => {
        const [state, setState] = React.useState({ list: props.list })

        component1StateList = state.list

        React.useEffect(() => {
          setState((prevState) => ({ ...prevState, list: props.list }))
        }, [props.list])

        renderSpy1()

        return <Component2 list={state.list} />
      }

      const Component1 = component1Decorator(component1)

      const mapStateSpy2 = vi.fn()
      const renderSpy2 = vi.fn()

      interface Component2Tstate {
        mappedProp: string[]
      }
      const component2Decorator = connect<
        Component2Tstate,
        unknown,
        Omit<RootStateType, 'byId'>,
        RootStateType
      >(
        (
          state: RootStateType,
          ownProps: Omit<RootStateType, 'byId'>,
        ): Component2Tstate => {
          mapStateSpy2()

          return {
            mappedProp: ownProps.list.map((id) => state.byId[id]),
          }
        },
      )
      interface Component2PropsType {
        list: number[]
      }

      const component2 = (props: Component2PropsType) => {
        renderSpy2()

        expect(props.list).toBe(component1StateList)

        return <div>Hello</div>
      }

      const Component2 = component2Decorator(component2)

      rtl.render(
        <ProviderMock store={store}>
          <Component1 />
        </ProviderMock>,
      )

      // 1. Initial render
      expect(mapStateSpy1).toHaveBeenCalledOnce()

      // 1.Initial render
      // 2. C1 useEffect
      expect(renderSpy1).toHaveBeenCalledTimes(2)

      // 1. Initial render
      expect(mapStateSpy2).toHaveBeenCalledOnce()

      // 1. Initial render
      expect(renderSpy2).toHaveBeenCalledOnce()

      rtl.act(() => {
        store.dispatch({ type: 'FOO' })
      })

      // 2. Store dispatch
      expect(mapStateSpy1).toHaveBeenCalledTimes(2)

      // 3. Store dispatch
      // 4. C1 useEffect
      expect(renderSpy1).toHaveBeenCalledTimes(4)

      // 2. Connect(C2) subscriber
      // 3. Ignored prev child props in re-render and re-runs mapState
      expect(mapStateSpy2).toHaveBeenCalledTimes(3)

      // 2. Batched update from nested subscriber / C1 re-render
      // Not sure why the differences across versions here
      // TODO: Figure out why this is 3 in React 18 but 2 in React 19
      const numFinalRenders = IS_REACT_18 ? 3 : 2
      expect(renderSpy2).toHaveBeenCalledTimes(numFinalRenders)
    })
  })
})
