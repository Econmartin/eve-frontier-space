"""The game's own "standard" (vanilla) values for crafted items, worked out by the client's code.
Usage: python3 extract_crafted_defaults.py <client build dir> <data/game dir>

The client builds each crafted item's standard through its main schema from standard inputs
(neotype/craftdefaults.py); the "atypical" labels and the build screen's deltas compare against it.
This runs that code from code.ccp, unchanged, on the tables dump_fsd.py already wrote (FSD loaders are
replaced by those JSON files). Writes crafted_defaults.json. Needs the client's Python minor version (3.12).
"""
import sys, os, json, zipfile, marshal, types, importlib.abc, importlib.util
build, d = sys.argv[1:3]; ccp = os.path.join(build, "code.ccp")
z = zipfile.ZipFile(ccp); names = set(z.namelist())

class Row:
    def __init__(s, v): s.__dict__['_v'] = v
    def __getattr__(s, k):
        v = s._v.get(k) if isinstance(s._v, dict) else None
        return wrap(v)
    def __iter__(s): return iter(wrap(x) for x in s._v)
    def __len__(s): return len(s._v)
def wrap(v):
    if isinstance(v, dict): return Row(v)
    if isinstance(v, list): return [wrap(x) for x in v]
    return v
class Table(dict): pass
def load_table(res):
    fn = os.path.join(d, os.path.basename(res).split('.')[0].lower() + '.json')
    raw = json.load(open(fn))
    t = Table(); t.update({int(k): wrap(v) for k, v in raw.items()}); return t

def stub(name, **attrs):
    m = types.ModuleType(name); m.__dict__.update(attrs); sys.modules[name] = m; return m
class BuiltDataLoader:
    _cache = None
    @classmethod
    def GetData(cls):
        if cls.__dict__.get('_t') is None: cls._t = load_table(cls.__resBuiltFile__)
        return cls._t
    @classmethod
    def ConnectToOnReload(cls, cb): pass
stub('fsdBuiltData'); stub('fsdBuiltData.common'); stub('fsdBuiltData.common.base', BuiltDataLoader=BuiltDataLoader)
def Memoize(*a, **k):
    if a and callable(a[0]) and not k: return a[0]
    return lambda f: f
stub('caching'); stub('caching.memoize', Memoize=Memoize)
stub('dogma'); stub('dogma.data'); stub('localization', GetByMessageID=lambda *a, **k: '')
for l in ['neoTypeProperty','neoTypeTrait','propertyDerivationBreakpoint','propertyDerivation','propertyDerivationTerm','property','recipeDerivationWiring','recipeFacilities','recipeInput','recipeInputTrait','recipe','recipeOutput','recipeOutputTransformBreakpoint','recipeOutputTransform','recipeOutputTransformSource','recipeOutputYieldBreakpoint','recipeOutputYieldSource','trait','traitProperty']:
    stub(l + 'Loader')

T = {int(k): v for k, v in json.load(open(os.path.join(d, 'types.json'))).items()}
G = {int(k): v for k, v in json.load(open(os.path.join(d, 'groups.json'))).items()}
ev = stub('evetypes',
    Exists=lambda t: t in T,
    GetName=lambda t: T[t].get('typeName', str(t)),
    GetQuantityKind=lambda t: T[t].get('quantityKind'),
    GetGroupID=lambda t: T[t].get('groupID'),
    GetCategoryID=lambda t: G.get(T[t].get('groupID'), {}).get('categoryID'),
    GetMass=lambda t: T[t].get('mass'))
stub('evetypes.data', Types=BuiltDataLoader, Groups=BuiltDataLoader, Categories=BuiltDataLoader); ev.data = sys.modules['evetypes.data']
stub('inventorycommon'); stub('inventorycommon.const', categoryAsteroid=25); sys.modules['inventorycommon'].const = sys.modules['inventorycommon.const']

class CCP(importlib.abc.MetaPathFinder, importlib.abc.Loader):
    def find_spec(s, name, path, target=None):
        if not name.startswith('neotype'): return None
        p = name.replace('.', '/')
        for cand, pkg in ((p + '/__init__.pyc', True), (p + '.pyc', False)):
            if cand in names: return importlib.util.spec_from_loader(name, s, is_package=pkg) if not pkg else importlib.util.spec_from_loader(name, s, is_package=True)
    def create_module(s, spec): return None
    def exec_module(s, m):
        p = m.__name__.replace('.', '/'); cand = p + '/__init__.pyc' if p + '/__init__.pyc' in names else p + '.pyc'
        if cand.endswith('__init__.pyc'): m.__path__ = []
        exec(marshal.loads(z.read(cand)[16:]), m.__dict__)
sys.meta_path.insert(0, CCP())

import logging; logging.basicConfig(level=logging.WARNING)
from neotype import craftdefaults as cd
cat = cd.read_craft_catalog()
D = cd.CraftedDefaults(cat); D.build_all()
out = {str(t): {str(p): v for p, v in props.items()} for t, props in D._defaults.items() if props}
json.dump({'defaults': out, 'choices': {str(k): v for k, v in D.choices.items()}, 'findings': [[t, s] for t, s in D.findings]}, open(os.path.join(d, 'crafted_defaults.json'), 'w'), indent=0)
print('crafted defaults:', len(out), 'items,', len(D.findings), 'findings')
