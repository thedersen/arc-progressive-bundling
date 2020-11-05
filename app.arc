@app
arc-progressive-bundle

@static
fingerprint true

@http
get /
get /_modules/*

# @aws
# profile default
# region us-west-1

@tables
pb-cache
  key *String

test
  foo *String
