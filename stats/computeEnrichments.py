#!/usr/bin/env python

# Load required modules
import sys, os, json, numpy, time
import magistats as S # local

# rounds all the floats in a json
def round_all(obj, N):
	if isinstance(obj, float):
		return round(obj, N)
	elif isinstance(obj, dict):
		return dict((k, round_all(v, N)) for (k, v) in obj.items())
	elif isinstance(obj, (list, tuple)):
		return map(lambda o: round_all(o, N), obj)
	return obj

def get_parser():
	import argparse
	parser = argparse.ArgumentParser(description='')
	parser.add_argument('-r', '--request', type=str,
		required=True, help='Request (JSON).')
	return parser

def run( args ):
	# load raw data
	rawdata = json.loads( args.request )

	# Sometimes JSON loading once isn't enough, in which case load it again
	# TODO: figure out why you need this, doesn't make any sense
	if type(rawdata) == type(u""): rawdata = json.loads(rawdata)

	# choose the request type
	requestType = "contingency" # default
	if "request" in rawdata:
		requestType = rawdata["request"]

	# check if we have that request
	stat_packages = dict(contingency=S.contingency_tests,
						 partitions=S.partition_tests)

	if requestType not in stat_packages:
		sys.exit(2) # Unknown request
		return

	# get the statistics package
	engine = stat_packages[requestType]()

	# check for any known errors
	errors = engine.validate(rawdata)
	if errors:
		print errors
		sys.exit(3) # Errors
		return

	# compute result
	result = engine.tests(rawdata)
	result['request'] = requestType
	print json.dumps(result)

if __name__ == "__main__": run( get_parser().parse_args(sys.argv[1:]) )
