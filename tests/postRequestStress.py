import sys
import urllib
import urllib2

big = {'big': str([i for i in xrange(110000)])} # 1454 Kb

def makeRequest(address, sendData):
  url = address+'/startLog'
  data = urllib.urlencode(sendData)
  #print sys.getsizeof(data)/1024, 'Kb'
  req = urllib2.Request(url,data)
  response = urllib2.urlopen(req)
  result = response.read()
  print response.getcode()

magi = 'http://localhost:8000'
for r in xrange(10000):
  print r
  makeRequest(magi, big)