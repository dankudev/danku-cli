import {runCommand} from '@oclif/test'
import {expect} from 'chai'

describe('modules:marketing', () => {
  it('runs modules:marketing cmd', async () => {
    const {stdout} = await runCommand('modules:marketing')
    expect(stdout).to.contain('hello world')
  })

  it('runs modules:marketing --name oclif', async () => {
    const {stdout} = await runCommand('modules:marketing --name oclif')
    expect(stdout).to.contain('hello oclif')
  })
})
