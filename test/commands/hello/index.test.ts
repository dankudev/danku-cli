import {runCommand} from '@oclif/test'
import {expect} from 'chai'

describe('add', () => {
  it('runs add', async () => {
    const {stdout} = await runCommand('add friend --from oclif')
    expect(stdout).to.contain('add friend from oclif!')
  })
})
