
import React, {Component, PropTypes} from 'react'
import {connect} from '../connect'
import {createSelector, createStructuredSelector} from 'reselect'
import {camelify} from '../../util/format'

import os from '../../util/os'
import ClassificationActions from '../../constants/classification-actions'

import MainAction from './main-action'
import SecondaryActions from './secondary-actions'

import * as actions from '../../actions'

class GameActions extends Component {

  render () {
    const {props} = this

    return <div className='game-actions'>
      <MainAction {...props}/>
      <SecondaryActions {...props}/>
    </div>
  }

}

const platform = os.itchPlatform()
const platformProp = camelify('p_' + platform)

const isPlatformCompatible = (game) => {
  return !!game[platformProp]
}

MainAction.propTypes = {
  // specified
  game: PropTypes.shape({
    id: PropTypes.any.isRequired
  }),

  // derived
  animate: PropTypes.bool,
  action: PropTypes.string,
  cave: PropTypes.any,
  mayDownload: PropTypes.bool,
  platformCompatible: PropTypes.bool,
  task: PropTypes.string,
  progress: PropTypes.number,
  cancellable: PropTypes.bool,

  t: PropTypes.func.isRequired,
  queueGame: PropTypes.func.isRequired,
  reportCave: PropTypes.func.isRequired,
  cancelCave: PropTypes.func.isRequired,
  initiatePurchase: PropTypes.func.isRequired,
  browseGame: PropTypes.func.isRequired
}

const makeMapStateToProps = () => {
  const selector = createSelector(
    createStructuredSelector({
      game: (state, props) => props.game,
      cave: (state, props) => state.globalMarket.cavesByGameId[props.game.id],
      task: (state, props) => state.tasks.tasksByGameId[props.game.id],
      download: (state, props) => state.tasks.downloadsByGameId[props.game.id]
    }),
    (happenings) => {
      const {game, cave, task, download} = happenings
      const animate = false
      const action = ClassificationActions[game.classification] || 'launch'
      const platformCompatible = (action === 'open' ? true : isPlatformCompatible(game))
      const cancellable = /^download.*/.test(task)

      return {
        cancellable,
        cave,
        animate,
        platform,
        platformCompatible,
        action,
        task: (task ? task.name : (download ? 'download' : (cave ? 'idle' : null))),
        progress: (task ? task.progress : (download ? download.progress : 0))
      }
    }
  )

  return selector
}

const mapDispatchToProps = (dispatch) => ({
  queueGame: (game) => dispatch(actions.queueGame({game})),
  reportCave: (caveId) => dispatch(actions.reportCave({caveId})),
  cancelCave: (caveId) => dispatch(actions.cancelCave({caveId})),
  initiatePurchase: (game) => dispatch(actions.initiatePurchase({game})),
  browseGame: (gameId, url) => dispatch(actions.initiatePurchase({gameId, url}))
})

export default connect(
  makeMapStateToProps,
  mapDispatchToProps
)(GameActions)
