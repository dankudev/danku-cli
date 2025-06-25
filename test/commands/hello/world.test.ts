import {runCommand} from '@oclif/test'
import {expect} from 'chai'

describe('add world', () => {
  it('runs add world cmd', async () => {
    const {stdout} = await runCommand('add world')
    expect(stdout).to.contain('add world!')
  })
})
