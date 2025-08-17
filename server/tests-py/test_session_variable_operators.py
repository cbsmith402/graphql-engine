#!/usr/bin/env python3

"""
End-to-end tests for session variable operators in Hasura GraphQL Engine.

These tests verify that the new session variable operators (_seq, _sne, _scontains, _sin)
work correctly in real permission scenarios.
"""

import pytest
import json
from validate import check_query_f


class TestSessionVariableOperators:
    """Test session variable operators in permissions."""

    @classmethod
    def dir(cls):
        return 'queries/session_variable_operators'

    def test_seq_operator_user_isolation(self, hge_ctx):
        """Test _seq operator for user isolation patterns."""
        # Set up table and permissions using _seq
        check_query_f(hge_ctx, self.dir() + '/setup_user_table.yaml')
        
        # Create permission that only allows users to see their own records
        permission_metadata = {
            "type": "create_select_permission",
            "args": {
                "table": "users",
                "role": "user",
                "permission": {
                    "columns": ["id", "name", "email"],
                    "filter": {
                        "_seq": {
                            "var": "X-Hasura-User-Id",
                            "value": "123"
                        }
                    }
                }
            }
        }
        
        # Apply permission
        resp = hge_ctx.v1q(permission_metadata)
        assert resp['message'] == 'success'
        
        # Test query with matching session variable
        headers = {'X-Hasura-Role': 'user', 'X-Hasura-User-Id': '123'}
        query = {
            "query": "{ users { id name email } }"
        }
        
        resp = hge_ctx.v1graphql(query, headers=headers)
        assert 'errors' not in resp
        # Should return results since session variable matches
        
        # Test query with non-matching session variable
        headers = {'X-Hasura-Role': 'user', 'X-Hasura-User-Id': '456'}
        resp = hge_ctx.v1graphql(query, headers=headers)
        assert 'errors' not in resp
        # Should return empty results since session variable doesn't match
        assert resp['data']['users'] == []
        
        # Cleanup
        check_query_f(hge_ctx, self.dir() + '/teardown_user_table.yaml')

    def test_sne_operator_role_exclusion(self, hge_ctx):
        """Test _sne operator for role exclusion patterns."""
        check_query_f(hge_ctx, self.dir() + '/setup_articles_table.yaml')
        
        # Create permission that excludes guest users
        permission_metadata = {
            "type": "create_select_permission",
            "args": {
                "table": "articles",
                "role": "public",
                "permission": {
                    "columns": ["id", "title", "content"],
                    "filter": {
                        "_sne": {
                            "var": "X-Hasura-Role",
                            "value": "guest"
                        }
                    }
                }
            }
        }
        
        resp = hge_ctx.v1q(permission_metadata)
        assert resp['message'] == 'success'
        
        # Test with non-guest role (should work)
        headers = {'X-Hasura-Role': 'public'}
        query = {"query": "{ articles { id title } }"}
        resp = hge_ctx.v1graphql(query, headers=headers)
        assert 'errors' not in resp
        
        # Cleanup
        check_query_f(hge_ctx, self.dir() + '/teardown_articles_table.yaml')

    def test_scontains_operator_permission_check(self, hge_ctx):
        """Test _scontains operator for permission-based access."""
        check_query_f(hge_ctx, self.dir() + '/setup_projects_table.yaml')
        
        # Create permission that checks for specific permission in session
        permission_metadata = {
            "type": "create_select_permission",
            "args": {
                "table": "projects",
                "role": "user",
                "permission": {
                    "columns": ["id", "name", "description"],
                    "filter": {
                        "_scontains": {
                            "var": "X-Hasura-Permissions",
                            "value": "view:projects"
                        }
                    }
                }
            }
        }
        
        resp = hge_ctx.v1q(permission_metadata)
        assert resp['message'] == 'success'
        
        # Test with matching permission
        headers = {
            'X-Hasura-Role': 'user',
            'X-Hasura-Permissions': 'view:projects,edit:tasks'
        }
        query = {"query": "{ projects { id name } }"}
        resp = hge_ctx.v1graphql(query, headers=headers)
        assert 'errors' not in resp
        
        # Test with non-matching permission
        headers = {
            'X-Hasura-Role': 'user',
            'X-Hasura-Permissions': 'edit:tasks,view:users'
        }
        resp = hge_ctx.v1graphql(query, headers=headers)
        assert 'errors' not in resp
        assert resp['data']['projects'] == []
        
        # Cleanup
        check_query_f(hge_ctx, self.dir() + '/teardown_projects_table.yaml')

    def test_sin_operator_group_membership(self, hge_ctx):
        """Test _sin operator for group membership patterns."""
        check_query_f(hge_ctx, self.dir() + '/setup_documents_table.yaml')
        
        # Create permission that checks group membership
        permission_metadata = {
            "type": "create_select_permission",
            "args": {
                "table": "documents",
                "role": "user",
                "permission": {
                    "columns": ["id", "title", "content"],
                    "filter": {
                        "_sin": {
                            "var": "X-Hasura-Group",
                            "value": ["admin", "editor", "viewer"]
                        }
                    }
                }
            }
        }
        
        resp = hge_ctx.v1q(permission_metadata)
        assert resp['message'] == 'success'
        
        # Test with allowed group
        headers = {'X-Hasura-Role': 'user', 'X-Hasura-Group': 'editor'}
        query = {"query": "{ documents { id title } }"}
        resp = hge_ctx.v1graphql(query, headers=headers)
        assert 'errors' not in resp
        
        # Test with disallowed group
        headers = {'X-Hasura-Role': 'user', 'X-Hasura-Group': 'guest'}
        resp = hge_ctx.v1graphql(query, headers=headers)
        assert 'errors' not in resp
        assert resp['data']['documents'] == []
        
        # Cleanup
        check_query_f(hge_ctx, self.dir() + '/teardown_documents_table.yaml')

    def test_complex_permission_combinations(self, hge_ctx):
        """Test complex combinations of session variable operators."""
        check_query_f(hge_ctx, self.dir() + '/setup_complex_table.yaml')
        
        # Create permission with multiple session variable conditions
        permission_metadata = {
            "type": "create_select_permission",
            "args": {
                "table": "sensitive_data",
                "role": "user",
                "permission": {
                    "columns": ["id", "data"],
                    "filter": {
                        "_and": [
                            {
                                "_sne": {
                                    "var": "X-Hasura-Role",
                                    "value": "guest"
                                }
                            },
                            {
                                "_or": [
                                    {
                                        "_seq": {
                                            "var": "X-Hasura-Role",
                                            "value": "admin"
                                        }
                                    },
                                    {
                                        "_scontains": {
                                            "var": "X-Hasura-Permissions",
                                            "value": "view:sensitive"
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        }
        
        resp = hge_ctx.v1q(permission_metadata)
        assert resp['message'] == 'success'
        
        # Test admin access
        headers = {'X-Hasura-Role': 'user', 'X-Hasura-Role': 'admin'}
        query = {"query": "{ sensitive_data { id } }"}
        resp = hge_ctx.v1graphql(query, headers=headers)
        assert 'errors' not in resp
        
        # Test permission-based access
        headers = {
            'X-Hasura-Role': 'user',
            'X-Hasura-Permissions': 'view:sensitive,edit:data'
        }
        resp = hge_ctx.v1graphql(query, headers=headers)
        assert 'errors' not in resp
        
        # Test denied access (guest role)
        headers = {'X-Hasura-Role': 'guest'}
        resp = hge_ctx.v1graphql(query, headers=headers)
        assert 'errors' not in resp
        assert resp['data']['sensitive_data'] == []
        
        # Cleanup
        check_query_f(hge_ctx, self.dir() + '/teardown_complex_table.yaml')

    def test_explain_query_with_session_variables(self, hge_ctx):
        """Test that EXPLAIN queries work correctly with session variable operators."""
        check_query_f(hge_ctx, self.dir() + '/setup_explain_table.yaml')
        
        # Create permission with session variable operator
        permission_metadata = {
            "type": "create_select_permission",
            "args": {
                "table": "test_table",
                "role": "user",
                "permission": {
                    "columns": ["id", "name"],
                    "filter": {
                        "_seq": {
                            "var": "X-Hasura-User-Id",
                            "value": "123"
                        }
                    }
                }
            }
        }
        
        resp = hge_ctx.v1q(permission_metadata)
        assert resp['message'] == 'success'
        
        # Test EXPLAIN query
        explain_query = {
            "type": "explain",
            "args": {
                "query": "query { test_table { id name } }",
                "user": {
                    "X-Hasura-Role": "user",
                    "X-Hasura-User-Id": "123"
                }
            }
        }
        
        resp = hge_ctx.v1q(explain_query)
        assert 'sql' in resp
        assert 'plan' in resp
        # Verify that the session variable condition is resolved in the SQL
        
        # Cleanup
        check_query_f(hge_ctx, self.dir() + '/teardown_explain_table.yaml')

    def test_session_variable_operators_in_mutations(self, hge_ctx):
        """Test session variable operators in mutation permissions."""
        check_query_f(hge_ctx, self.dir() + '/setup_mutation_table.yaml')
        
        # Create insert permission with session variable check
        permission_metadata = {
            "type": "create_insert_permission",
            "args": {
                "table": "user_posts",
                "role": "user",
                "permission": {
                    "check": {
                        "_seq": {
                            "var": "X-Hasura-User-Id",
                            "value": "author_id"  # Check against column value
                        }
                    },
                    "columns": ["title", "content", "author_id"]
                }
            }
        }
        
        resp = hge_ctx.v1q(permission_metadata)
        assert resp['message'] == 'success'
        
        # Test mutation with valid session variable
        headers = {'X-Hasura-Role': 'user', 'X-Hasura-User-Id': '123'}
        mutation = {
            "query": '''
                mutation {
                    insert_user_posts_one(object: {title: "Test", content: "Content", author_id: "123"}) {
                        id
                        title
                    }
                }
            '''
        }
        
        resp = hge_ctx.v1graphql(mutation, headers=headers)
        assert 'errors' not in resp
        
        # Cleanup
        check_query_f(hge_ctx, self.dir() + '/teardown_mutation_table.yaml')

    def test_error_handling_missing_session_variables(self, hge_ctx):
        """Test graceful handling when required session variables are missing."""
        check_query_f(hge_ctx, self.dir() + '/setup_error_table.yaml')
        
        # Create permission requiring session variable
        permission_metadata = {
            "type": "create_select_permission",
            "args": {
                "table": "protected_table",
                "role": "user",
                "permission": {
                    "columns": ["id", "data"],
                    "filter": {
                        "_seq": {
                            "var": "X-Hasura-Required-Var",
                            "value": "expected"
                        }
                    }
                }
            }
        }
        
        resp = hge_ctx.v1q(permission_metadata)
        assert resp['message'] == 'success'
        
        # Test query without required session variable
        headers = {'X-Hasura-Role': 'user'}  # Missing X-Hasura-Required-Var
        query = {"query": "{ protected_table { id } }"}
        resp = hge_ctx.v1graphql(query, headers=headers)
        
        # Should not error, but should return empty results
        assert 'errors' not in resp
        assert resp['data']['protected_table'] == []
        
        # Cleanup
        check_query_f(hge_ctx, self.dir() + '/teardown_error_table.yaml')


# Helper test configurations
setup_queries = [
    'setup_user_table.yaml',
    'setup_articles_table.yaml', 
    'setup_projects_table.yaml',
    'setup_documents_table.yaml',
    'setup_complex_table.yaml',
    'setup_explain_table.yaml',
    'setup_mutation_table.yaml',
    'setup_error_table.yaml'
]

teardown_queries = [
    'teardown_user_table.yaml',
    'teardown_articles_table.yaml',
    'teardown_projects_table.yaml', 
    'teardown_documents_table.yaml',
    'teardown_complex_table.yaml',
    'teardown_explain_table.yaml',
    'teardown_mutation_table.yaml',
    'teardown_error_table.yaml'
]