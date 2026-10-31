#include <Python.h>
#include <stdio.h>
#include <stdlib.h>
/* usage: host <code.ccp> <bin64> script.py [args...] */
int main(int argc, char **argv) {
    if (argc < 4) { fprintf(stderr, "usage: host code.ccp bin64 script.py [args]\n"); return 2; }
    PyConfig config; PyConfig_InitIsolatedConfig(&config);
    config.site_import = 0;
    config.module_search_paths_set = 1;
    PyWideStringList_Append(&config.module_search_paths, Py_DecodeLocale(argv[1], NULL));
    PyWideStringList_Append(&config.module_search_paths, Py_DecodeLocale(argv[2], NULL));
    PyStatus st = PyConfig_SetBytesArgv(&config, argc - 3, argv + 3);
    if (PyStatus_Exception(st)) { Py_ExitStatusException(st); }
    st = Py_InitializeFromConfig(&config);
    if (PyStatus_Exception(st)) { Py_ExitStatusException(st); }
    PyConfig_Clear(&config);
    FILE *f = fopen(argv[3], "r");
    if (!f) { perror("open"); return 1; }
    int rc = PyRun_SimpleFileEx(f, argv[3], 1);
    Py_FinalizeEx();
    return rc;
}
