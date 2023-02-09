# idea is to add a string to a tree to optimize
# searching for that string.

class bintree:
    
    def __init__(self, Key = None, level = -1) -> None:
        self.LevelKey:dict = {}
        self.Children:list = []
        self.Key:str = Key
        self.Level:int = level
        self.AllObjects:list = []


    def addKey(self,_key, _object, __currlevel = -1):

    
        if not self.AllObjects.__contains__(_object):
            self.AllObjects.append(object)

        # check if length of key is 0, if it is convert key to None for brevity
        if not _key is None:
            if len(_key) == 0:
                _key = None

        # if there is no key this must be the first level
        # if there is a key and currentlevel has reached the length of the string..
        if _key is None or len(_key) == __currlevel+1:

            # object existed return false.
            if self.Children.__contains__(object):
                return False
            
            # object did not exist, add and return true.
            list.append( self.Children,_object)
            return True

        # get the current character from the key
        currchar = _key[__currlevel+1]

        if self.LevelKey.__contains__(currchar):
            curr:bintree = self.LevelKey[currchar]
            return curr.addKey(_key,_object,__currlevel+1)
        else:
            curr:bintree = bintree(currchar, __currlevel+1)
            self.LevelKey[currchar] = curr;
            return curr.addKey(_key,_object,__currlevel+1)
    
    # traverses the key to return the keypath specified, if found returns the bintree
    # if not returns None.
    def FollowKeyPath(self, key:str, __currlevel:int = -1):
        currtree = self

        for i in key:
            if currtree.LevelKey.__contains__(i):
                currtree = currtree.LevelKey[i]
            else:
                return None
        
        return currtree

    def Find(self,key, object):

        k = self.FollowKeyPath(key)
        
        if not k is None:
            return  k.Children.__contains__(object)
        else:
            return False

            

            

